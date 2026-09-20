import { envConfig } from './config/env';
import { setuAuthService } from './services/setuAuthService';

async function testGatewayUrls() {
  const token = await setuAuthService.getAccessToken();

  const candidates = [
    'https://fiu.setu.co/consents',
    'https://fiu-sandbox.setu.co/v2/consents',
    'https://fiu.setu.co/v2/consents',
    'https://fiu-sandbox.setu.co/consents',
  ];

  const payload = {
    Detail: {
      consentMode: 'STORE',
      fetchType: 'PERIODIC',
      consentTypes: ['TRANSACTIONS'],
      fiTypes: ['DEPOSIT'],
      DataConsumer: { id: 'SETU-FIU' },
      Customer: { id: '9876543210@setu' },
      Purpose: {
        code: '101',
        refUri: 'https://api.rebit.org.in/doc/purpose/101.xml',
        text: 'To help you track your income, expenses, and personal finances',
        Category: { type: 'string' },
      },
      FIDataRange: {
        from: '2026-06-01T00:00:00.000Z',
        to: '2026-09-20T00:00:00.000Z',
      },
      consentDateTime: '2026-09-20T12:00:00.000Z',
      Frequency: { value: 1, unit: 'DAY' },
      DataLife: { value: 1, unit: 'MONTH' },
      DataFilter: [{ type: 'TRANSACTIONAMOUNT', operator: '>=', value: '0' }],
    },
    redirectUrl: 'https://dry-parks-work.loca.lt/aa/callback',
  };

  for (const url of candidates) {
    console.log(`\nTesting gateway URL: ${url}`);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-product-instance-id': envConfig.setu.productInstanceId,
        },
        body: JSON.stringify(payload),
      });
      console.log('Status:', res.status);
      console.log('Body:', await res.text());
    } catch (e: any) {
      console.log('Error:', e.message);
    }
  }
}

testGatewayUrls();
