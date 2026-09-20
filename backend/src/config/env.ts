import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.backend or root .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.backend') });
dotenv.config();

export interface BackendEnvConfig {
  port: number;
  nodeEnv: string;
  clientOrigin: string;
  isSandboxSimulatorEnabled: boolean;
  setu: {
    baseUrl: string;
    clientId: string;
    clientSecret: string;
    productInstanceId: string;
    webhookSecret: string;
    redirectUrl: string;
  };
}

export const envConfig: BackendEnvConfig = {
  port: parseInt((process.env.PORT || '4000').trim(), 10),
  nodeEnv: (process.env.NODE_ENV || 'development').trim(),
  clientOrigin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').trim(),
  get isSandboxSimulatorEnabled(): boolean {
    return (process.env.SETU_SANDBOX_SIMULATOR || 'false').trim().toLowerCase() === 'true';
  },
  setu: {
    baseUrl: (process.env.SETU_BASE_URL || 'https://fiu-sandbox.setu.co').trim(),
    clientId: (process.env.SETU_CLIENT_ID || '').trim(),
    clientSecret: (process.env.SETU_CLIENT_SECRET || '').trim(),
    productInstanceId: (process.env.SETU_PRODUCT_INSTANCE_ID || '').trim(),
    webhookSecret: (process.env.SETU_WEBHOOK_SECRET || '').trim(),
    redirectUrl: (process.env.SETU_REDIRECT_URL || `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/aa/callback`).trim(),
  },
};


