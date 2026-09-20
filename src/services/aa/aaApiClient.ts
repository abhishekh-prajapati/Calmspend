import type {
  AAConsent,
  ApiResponse,
  NormalizedDepositAccount,
} from '../../types/accountAggregator';

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://localhost:4000/api';

export class AaApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async createConsent(
    mobileNumber: string,
    redirectUrl?: string
  ): Promise<{ consent: AAConsent; redirectUrl: string }> {
    const res = await fetch(`${this.baseUrl}/aa/consents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobileNumber,
        redirectUrl: redirectUrl || `${window.location.origin}/aa/callback`,
      }),
    });

    const json: ApiResponse<{ consent: AAConsent; redirectUrl: string }> = await res.json();
    if (!res.ok || json.error || !json.data) {
      throw new Error(json.error || 'Failed to initiate Account Aggregator consent');
    }

    return json.data;
  }

  async getConsentStatus(consentId: string): Promise<AAConsent> {
    const res = await fetch(`${this.baseUrl}/aa/consents/${consentId}/status`);
    const json: ApiResponse<AAConsent> = await res.json();

    if (!res.ok || json.error || !json.data) {
      throw new Error(json.error || 'Failed to fetch consent status');
    }

    return json.data;
  }

  async revokeConsent(consentId: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/aa/consents/${consentId}/revoke`, {
      method: 'POST',
    });
    const json: ApiResponse<{ success: boolean }> = await res.json();

    if (!res.ok || json.error) {
      throw new Error(json.error || 'Failed to revoke consent');
    }

    return !!json.data?.success;
  }

  async triggerSync(
    consentId: string,
    fipName?: string
  ): Promise<{ sessionId: string; accounts: NormalizedDepositAccount[] }> {
    const res = await fetch(`${this.baseUrl}/aa/sync/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consentId, fipName }),
    });

    const json: ApiResponse<{ sessionId: string; accounts: NormalizedDepositAccount[] }> =
      await res.json();

    if (!res.ok || json.error || !json.data) {
      throw new Error(json.error || 'Failed to synchronize account statements');
    }

    return json.data;
  }
}

export const aaApiClient = new AaApiClient();
