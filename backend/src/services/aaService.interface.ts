import type {
  CreateConsentRequest,
  CreateConsentResponse,
  ConsentStatusResponse,
  NormalizedDepositAccount,
} from '../types/aa.types';

export interface IAaService {
  createConsent(params: CreateConsentRequest): Promise<CreateConsentResponse>;
  getConsentStatus(consentId: string): Promise<ConsentStatusResponse>;
  revokeConsent(consentId: string): Promise<boolean>;
  fetchStatements(consentId: string): Promise<NormalizedDepositAccount[]>;
}
