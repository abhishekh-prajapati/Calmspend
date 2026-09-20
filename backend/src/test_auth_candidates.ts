import { envConfig } from './config/env';

async function testSandboxAuthUrls() {
  const authCandidates = [
    'https://accountservice.sandbox.setu.co/v1/users/login',
    'https://accountservice-sandbox.setu.co/v1/users/login',
    'https://accountservice.setu.co/v1/users/login',
  ];

  for (const url of authCandidates) {
    console.log(`\nTesting auth URL: ${url}`);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          client: 'bridge',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientID: envConfig.setu.clientId,
          secret: envConfig.setu.clientSecret,
          grant_type: 'client_credentials',
        }),
      });
      console.log('Status:', res.status);
      const text = await res.text();
      console.log('Response (truncated):', text.slice(0, 100));
      if (res.ok) {
        const json = JSON.parse(text);
        if (json.access_token) {
          const parts = json.access_token.split('.');
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          console.log('Token ISS:', payload.iss);
          // Test against fiu-sandbox.setu.co/consents
          const testRes = await fetch(`${envConfig.setu.baseUrl}/consents`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${json.access_token}`,
              'x-product-instance-id': envConfig.setu.productInstanceId,
            },
            body: JSON.stringify({ test: true }),
          });
          console.log('Gateway response status with this token:', testRes.status);
          console.log('Gateway response body:', await testRes.text());
        }
      }
    } catch (e: any) {
      console.log('Error:', e.message);
    }
  }
}

testSandboxAuthUrls();
