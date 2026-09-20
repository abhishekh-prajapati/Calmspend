import { envConfig } from '../config/env';
import { setuAuthService } from './setuAuthService';
import { logger } from '../utils/logger';

export class SetuClient {
  private baseUrl: string;
  private productInstanceId: string;

  constructor() {
    this.baseUrl = envConfig.setu.baseUrl;
    this.productInstanceId = envConfig.setu.productInstanceId;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const token = await setuAuthService.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    if (this.productInstanceId) {
      headers['x-product-instance-id'] = this.productInstanceId;
    }

    return headers;
  }

  async post<T>(endpoint: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = await this.getHeaders();

    logger.info(`SetuClient: POST ${endpoint}`);

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (res.status === 401) {
      logger.warn(`SetuClient: Received 401 from ${endpoint}, invalidating token cache and retrying...`);
      setuAuthService.invalidateCache();
      const freshHeaders = await this.getHeaders();
      const retryRes = await fetch(url, {
        method: 'POST',
        headers: freshHeaders,
        body: JSON.stringify(body),
      });
      if (!retryRes.ok) {
        const errorText = await retryRes.text();
        throw new Error(`Setu API POST ${endpoint} retry failed (${retryRes.status}): ${errorText}`);
      }
      return (await retryRes.json()) as T;
    }

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Setu API POST ${endpoint} failed (${res.status}): ${errorText}`);
    }

    return (await res.json()) as T;
  }

  async get<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = await this.getHeaders();

    logger.info(`SetuClient: GET ${endpoint}`);

    const res = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (res.status === 401) {
      logger.warn(`SetuClient: Received 401 from ${endpoint}, invalidating token cache and retrying...`);
      setuAuthService.invalidateCache();
      const freshHeaders = await this.getHeaders();
      const retryRes = await fetch(url, {
        method: 'GET',
        headers: freshHeaders,
      });
      if (!retryRes.ok) {
        const errorText = await retryRes.text();
        throw new Error(`Setu API GET ${endpoint} retry failed (${retryRes.status}): ${errorText}`);
      }
      return (await retryRes.json()) as T;
    }

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Setu API GET ${endpoint} failed (${res.status}): ${errorText}`);
    }

    return (await res.json()) as T;
  }
}

export const setuClient = new SetuClient();
