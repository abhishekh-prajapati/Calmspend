import { envConfig } from './config/env';
import { setuAuthService } from './services/setuAuthService';

async function testV2Consent() {
  const token = await setuAuthService.getAccessToken();

  const now = new Date();
  const validTo = new Date(now);
  validTo.setMonth(validTo.getMonth() + 1);

  const fromDate = new Date(now);
  fromDate.setMonth(fromDate.getMonth() - 3);

  const v2Payload = {
    vua: '9876543210@setu',
    consentMode: 'STORE',
    fetchType: 'PERIODIC',
    consentTypes: ['TRANSACTIONS'],
    fiTypes: ['DEPOSIT'],
    purpose: {
      code: '101',
      refUri: 'https://api.rebit.org.in/aa/purpose/101.xml',
      text: 'To help you track your income, expenses, and personal finances',
      category: { type: 'Personal Finance' },
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

  console.log('Sending v2 consent payload to https://fiu-sandbox.setu.co/v2/consents ...');

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
  const json = await res.json();
  console.log('Response JSON:', JSON.stringify(json, null, 2));
}

testV2Consent();
