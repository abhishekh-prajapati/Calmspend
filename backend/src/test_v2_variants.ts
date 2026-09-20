import { envConfig } from './config/env';
import { setuAuthService } from './services/setuAuthService';

async function testV2Variants() {
  const token = await setuAuthService.getAccessToken();

  const now = new Date();
  const validTo = new Date(now);
  validTo.setMonth(validTo.getMonth() + 1);

  const fromDate = new Date(now);
  fromDate.setMonth(fromDate.getMonth() - 3);

  const vuas = [
    '9876543210@onemoney',
    '9876543210@finvu',
    '9876543210@setu',
  ];

  for (const vua of vuas) {
    console.log(`\nTesting vua: ${vua}`);
    const v2Payload = {
      vua,
      consentMode: 'STORE',
      fetchType: 'PERIODIC',
      consentTypes: ['TRANSACTIONS'],
      fiTypes: ['DEPOSIT'],
      purpose: {
        code: '101',
        refUri: 'https://api.rebit.org.in/aa/purpose/101.xml',
        text: 'To help you track your income, expenses, and personal finances',
        category: { type: 'string' },
      },
      dataRange: {
        from: fromDate.toISOString(),
        to: now.toISOString(),
      },
      frequency: {
        value: 1,
        unit: 'DAY',
      },
      dataLife: {
        value: 1,
        unit: 'MONTH',
      },
      dataFilter: [
        {
          type: 'TRANSACTIONAMOUNT',
          operator: '>=',
          value: '0',
        },
      ],
      redirectUrl: 'https://dry-parks-work.loca.lt/aa/callback',
    };

    try {
      const res = await fetch('https://fiu-sandbox.setu.co/v2/consents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-product-instance-id': envConfig.setu.productInstanceId,
        },
        body: JSON.stringify(v2Payload),
      });

      console.log('Status:', res.status);
      const text = await res.text();
      console.log('Response:', text);
    } catch (e: any) {
      console.error('Error:', e.message);
    }
  }
}

testV2Variants();
