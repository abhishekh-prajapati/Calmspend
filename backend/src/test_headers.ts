import { envConfig } from './config/env';
import { setuAuthService } from './services/setuAuthService';

async function testHeaders() {
  console.log('Testing Setu Gateway Sandbox headers...');

  const token = await setuAuthService.getAccessToken();
  console.log('Got OAuth Token of length:', token.length);

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

  // Test Mode A: Bearer Token + x-product-instance-id
  console.log('\n--- Test A: Bearer Token + x-product-instance-id ---');
  try {
    const resA = await fetch(`${envConfig.setu.baseUrl}/consents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-product-instance-id': envConfig.setu.productInstanceId,
      },
      body: JSON.stringify(payload),
    });
    console.log('Status A:', resA.status);
    console.log('Body A:', await resA.text());
  } catch (e) {
    console.error('Error A:', e);
  }

  // Test Mode B: Direct Bridge Headers (x-client-id, x-client-secret, x-product-instance-id)
  console.log('\n--- Test B: Direct Bridge Headers (x-client-id, x-client-secret, x-product-instance-id) ---');
  try {
    const resB = await fetch(`${envConfig.setu.baseUrl}/consents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': envConfig.setu.clientId,
        'x-client-secret': envConfig.setu.clientSecret,
        'x-product-instance-id': envConfig.setu.productInstanceId,
      },
      body: JSON.stringify(payload),
    });
    console.log('Status B:', resB.status);
    console.log('Body B:', await resB.text());
  } catch (e) {
    console.error('Error B:', e);
  }
}

testHeaders();
