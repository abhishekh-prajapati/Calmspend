import crypto from 'crypto';
import type { IAaService } from './aaService.interface';
import type {
  CreateConsentRequest,
  CreateConsentResponse,
  ConsentStatusResponse,
  NormalizedDepositAccount,
  AAConsentStatus,
} from '../types/aa.types';
import { envConfig } from '../config/env';
import { setuClient } from './setuClient';
import { normalizerService } from './normalizerService';
import { sandboxSimulator } from './sandboxSimulator';
import { logger } from '../utils/logger';

// In-memory registry for consents and active sessions on backend
interface ConsentRecord {
  id: string;
  setuConsentId: string;
  customerVpa: string;
  mobileNumber: string;
  status: AAConsentStatus;
  consentUrl: string;
  validFrom: string;
  validTo: string;
  fipName?: string;
  fipId?: string;
}

const consentStore = new Map<string, ConsentRecord>();
const activeSessionsStore = new Map<string, { consentId: string; status: string }>();

export class SetuService implements IAaService {
  /**
   * Phase 2: Consent Creation (POST /consents)
   */
  async createConsent(params: CreateConsentRequest): Promise<CreateConsentResponse> {
    const internalConsentId = crypto.randomUUID();
    const cleanPhone = params.mobileNumber.replace(/\D/g, '');
    const customerVpa = params.customerVpa || `${cleanPhone}@setu`;

    const now = new Date();
    const validTo = new Date(now);
    validTo.setMonth(validTo.getMonth() + 1); // 1 Month Data Life

    const fromDate = new Date(now);
    fromDate.setMonth(fromDate.getMonth() - 3); // 3 Months Historical Range

    const redirectUrl =
      params.redirectUrl || envConfig.setu.redirectUrl;

    // 1. If Setu credentials are provided, call live Setu Sandbox Gateway API
    if (envConfig.setu.clientId && envConfig.setu.clientSecret) {
      try {
        const payload = {
          vua: customerVpa,
          consentMode: 'STORE',
          fetchType: 'PERIODIC',
          consentTypes: ['TRANSACTIONS'],
          fiTypes: ['DEPOSIT'],
          purpose: {
            code: '102',
            refUri: 'https://api.rebit.org.in/aa/purpose/102.xml',
            text: 'Customer spending patterns, budget or other reportings',
            category: { type: 'string' },
          },
          dataRange: {
            from: fromDate.toISOString().split('.')[0] + 'Z',
            to: now.toISOString().split('.')[0] + 'Z',
          },
          frequency: {
            unit: 'DAY',
            value: 1,
          },
          dataLife: {
            unit: 'MONTH',
            value: 1,
          },
          dataFilter: [
            {
              type: 'TRANSACTIONAMOUNT',
              operator: '>=',
              value: '0',
            },
          ],
          redirectUrl,
          context: [
            { key: 'accountSelectionMode', value: 'multi' },
          ],
        };

        const res = await setuClient.post<{
          id: string;
          url: string;
          status: string;
          handle?: string;
        }>('/v2/consents', payload);

        const record: ConsentRecord = {
          id: internalConsentId,
          setuConsentId: res.id,
          customerVpa,
          mobileNumber: cleanPhone,
          status: this.mapSetuStatus(res.status),
          consentUrl: res.url,
          validFrom: now.toISOString(),
          validTo: validTo.toISOString(),
        };
        consentStore.set(internalConsentId, record);
        consentStore.set(res.id, record);

        logger.info(`SetuService: Created live Setu consent ${res.id}`);
        return {
          consentId: internalConsentId,
          redirectUrl: res.url,
          status: record.status,
          validFrom: record.validFrom,
          validTo: record.validTo,
        };
      } catch (err: unknown) {
        const errObj = err as { message?: string; response?: { status?: number; data?: unknown } };
        const safeErrorMsg = errObj.message || 'Setu live consent creation failed';
        logger.error(`SetuService: Live consent creation failed: ${safeErrorMsg}`);

        if (!envConfig.isSandboxSimulatorEnabled) {
          throw new Error(safeErrorMsg);
        }
        logger.warn('SetuService: SETU_SANDBOX_SIMULATOR is enabled. Falling back to local sandbox simulator.');
      }
    }

    // 2. Sandbox Simulation Mode (only when simulator enabled or no live credentials)
    if (!envConfig.isSandboxSimulatorEnabled && envConfig.setu.clientId && envConfig.setu.clientSecret) {
      throw new Error('Setu AA consent creation failed and simulator is disabled');
    }

    const simulatedConsentUrl = `${redirectUrl}?status=SUCCESS&consent_id=${internalConsentId}&simulation=true`;

    const record: ConsentRecord = {
      id: internalConsentId,
      setuConsentId: `SETU-SANDBOX-${internalConsentId.substring(0, 8)}`,
      customerVpa,
      mobileNumber: cleanPhone,
      status: 'PENDING',
      consentUrl: simulatedConsentUrl,
      validFrom: now.toISOString(),
      validTo: validTo.toISOString(),
      fipName: 'HDFC Bank',
      fipId: 'SETU-FIP-HDFC',
    };
    consentStore.set(internalConsentId, record);

    logger.info(`SetuService: Created simulated consent ${internalConsentId}`);
    return {
      consentId: internalConsentId,
      redirectUrl: simulatedConsentUrl,
      status: 'PENDING',
      validFrom: record.validFrom,
      validTo: record.validTo,
    };
  }

  /**
   * Phase 3: Consent Status Inquiry (GET /v2/consents/:id)
   */
  async getConsentStatus(consentId: string): Promise<ConsentStatusResponse> {
    const record = consentStore.get(consentId);
    if (!record) {
      throw new Error(`Consent with ID ${consentId} not found`);
    }

    // If live Setu integration, poll Setu Gateway
    if (envConfig.setu.clientId && envConfig.setu.clientSecret && record.setuConsentId && !record.setuConsentId.startsWith('SETU-SANDBOX-')) {
      try {
        const res = await setuClient.get<{
          id: string;
          status: string;
          fipId?: string;
          fipName?: string;
        }>(`/v2/consents/${record.setuConsentId}`);

        record.status = this.mapSetuStatus(res.status);
        if (res.fipName) record.fipName = res.fipName;
        if (res.fipId) record.fipId = res.fipId;
      } catch (err) {
        logger.warn(`SetuService: Could not poll Setu status for ${record.setuConsentId}:`, err);
      }
    }

    return {
      consentId: record.id,
      status: record.status,
      fipId: record.fipId,
      fipName: record.fipName,
      validFrom: record.validFrom,
      validTo: record.validTo,
    };
  }

  /**
   * Updates consent status directly (e.g. via webhook or callback confirmation)
   */
  updateConsentStatus(consentId: string, status: AAConsentStatus): void {
    const record = consentStore.get(consentId);
    if (record) {
      record.status = status;
    }
  }

  /**
   * Phase 3 / Revocation: Revoke Consent (POST /v2/consents/:id/revoke)
   */
  async revokeConsent(consentId: string): Promise<boolean> {
    const record = consentStore.get(consentId);
    if (!record) return false;

    if (envConfig.setu.clientId && envConfig.setu.clientSecret && record.setuConsentId && !record.setuConsentId.startsWith('SETU-SANDBOX-')) {
      try {
        await setuClient.post(`/v2/consents/${record.setuConsentId}/revoke`, {});
      } catch (err) {
        logger.warn('SetuService: Failed to revoke Setu consent remotely:', err);
      }
    }

    record.status = 'REVOKED';
    return true;
  }

  /**
   * Phase 6: Create FI Data Session (POST /v2/sessions)
   */
  async createDataSession(consentId: string): Promise<{ sessionId: string; status: string }> {
    const record = consentStore.get(consentId);
    if (!record) {
      throw new Error(`Consent with ID ${consentId} not found`);
    }

    // Set consent as active on session creation
    if (record.status === 'PENDING') {
      record.status = 'ACTIVE';
    }

    const internalSessionId = crypto.randomUUID();
    const now = new Date();
    const fromDate = new Date(now);
    fromDate.setMonth(fromDate.getMonth() - 3);

    if (envConfig.setu.clientId && envConfig.setu.clientSecret && record.setuConsentId && !record.setuConsentId.startsWith('SETU-SANDBOX-')) {
      try {
        const payload = {
          consentId: record.setuConsentId,
          dataRange: {
            from: fromDate.toISOString().split('.')[0] + 'Z',
            to: now.toISOString().split('.')[0] + 'Z',
          },
          format: 'json',
        };

        const res = await setuClient.post<{ id: string; status: string }>('/v2/sessions', payload);
        activeSessionsStore.set(res.id, { consentId, status: res.status || 'PENDING' });
        return { sessionId: res.id, status: res.status || 'PENDING' };
      } catch (err) {
        logger.error('SetuService: Live session creation failed:', err);
        if (!envConfig.isSandboxSimulatorEnabled) {
          throw err;
        }
      }
    }

    if (!envConfig.isSandboxSimulatorEnabled && envConfig.setu.clientId && envConfig.setu.clientSecret) {
      throw new Error('Data session creation failed and simulator is disabled');
    }

    activeSessionsStore.set(internalSessionId, { consentId, status: 'READY' });
    return { sessionId: internalSessionId, status: 'READY' };
  }

  /**
   * Phase 7: Fetch FI Data Statements (GET /v2/sessions/:id?fetchType=all)
   */
  async fetchStatements(consentId: string): Promise<NormalizedDepositAccount[]> {
    const record = consentStore.get(consentId);
    const fipName = record?.fipName || 'HDFC Bank';

    // 1. Create FI data session
    const session = await this.createDataSession(consentId);

    // 2. Fetch live data if credentials configured
    if (envConfig.setu.clientId && envConfig.setu.clientSecret && !session.sessionId.startsWith('SETU-SANDBOX-')) {
      try {
        const res = await setuClient.get<unknown>(`/v2/sessions/${session.sessionId}?fetchType=all`);
        return normalizerService.normalizeDepositPayload(res, record?.fipId, fipName);
      } catch (err) {
        logger.error('SetuService: Live data fetch failed:', err);
        if (!envConfig.isSandboxSimulatorEnabled) {
          throw err;
        }
      }
    }

    if (!envConfig.isSandboxSimulatorEnabled && envConfig.setu.clientId && envConfig.setu.clientSecret) {
      throw new Error('Statement fetch failed and simulator is disabled');
    }

    // 3. Sandbox Simulator Response (only when enabled)
    return sandboxSimulator.generateSampleDepositData(fipName);
  }

  /**
   * Helper to map Setu raw status strings into internal AAConsentStatus enum
   */
  private mapSetuStatus(rawStatus?: string): AAConsentStatus {
    const s = (rawStatus || '').toUpperCase();
    if (s === 'ACTIVE' || s === 'APPROVED') return 'ACTIVE';
    if (s === 'REJECTED' || s === 'DENIED') return 'REJECTED';
    if (s === 'REVOKED') return 'REVOKED';
    if (s === 'EXPIRED') return 'EXPIRED';
    if (s === 'PAUSED') return 'PAUSED';
    if (s === 'FAILED') return 'FAILED';
    return 'PENDING';
  }
}

export const setuService = new SetuService();
