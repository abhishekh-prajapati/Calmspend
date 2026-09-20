import { envConfig } from '../config/env';
import { logger } from '../utils/logger';

interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

export class SetuAuthService {
  private cachedToken: string | null = null;
  private tokenExpiryTime: number = 0;

  /**
   * Retrieves a valid Bearer access token for Setu AA Gateway calls.
   * Reuses cached token if valid; requests a new token before the 300s expiry.
   */
  async getAccessToken(): Promise<string> {
    const now = Date.now();

    // Re-use cached token if it has at least 30 seconds of lifetime remaining
    if (this.cachedToken && this.tokenExpiryTime - now > 30000) {
      return this.cachedToken;
    }

    // If sandbox credentials are not configured, return a mock token for local simulation
    if (!envConfig.setu.clientId || !envConfig.setu.clientSecret) {
      return 'mock_sandbox_access_token';
    }

    try {
      const authUrl = 'https://accountservice.setu.co/v1/users/login';
      logger.info('SetuAuthService: Requesting new OAuth access token from Setu...');

      const res = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'client': 'bridge',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientID: envConfig.setu.clientId,
          secret: envConfig.setu.clientSecret,
          grant_type: 'client_credentials',
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Setu Auth failed with status ${res.status}: ${errText}`);
      }

      const json: TokenResponse = await res.json();
      this.cachedToken = json.access_token;

      // Default to 300 seconds TTL if not returned
      const ttlMs = (json.expires_in || 300) * 1000;
      this.tokenExpiryTime = now + ttlMs;

      logger.info(`SetuAuthService: New access token acquired, expires in ${json.expires_in || 300}s`);
      return this.cachedToken;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('SetuAuthService: Failed to retrieve access token:', msg);
      throw err;
    }
  }

  /**
   * Clears the cached token (e.g. on 401 Unauthorized from gateway)
   */
  invalidateCache(): void {
    this.cachedToken = null;
    this.tokenExpiryTime = 0;
  }
}

export const setuAuthService = new SetuAuthService();
