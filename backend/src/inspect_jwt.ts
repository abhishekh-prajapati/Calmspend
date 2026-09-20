import { setuAuthService } from './services/setuAuthService';

async function inspectToken() {
  const token = await setuAuthService.getAccessToken();
  const parts = token.split('.');
  if (parts.length === 3) {
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    console.log('Token Header:', header);
    console.log('Token Payload (without secrets):', {
      iss: payload.iss,
      aud: payload.aud,
      exp: payload.exp,
      sub: payload.sub,
    });
  }
}

inspectToken();
