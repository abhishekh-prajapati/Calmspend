import { setuAuthService } from './services/setuAuthService';
import { setuService } from './services/setuService';
import { envConfig } from './config/env';

async function runLiveTest() {
  console.log('=== REAL SETU SANDBOX CONNECTIVITY TEST ===\n');

  console.log('1. Configuration Check:');
  console.log('   SETU_BASE_URL:', envConfig.setu.baseUrl);
  console.log('   SETU_CLIENT_ID configured:', !!envConfig.setu.clientId);
  console.log('   SETU_CLIENT_SECRET configured:', !!envConfig.setu.clientSecret);
  console.log('   SETU_PRODUCT_INSTANCE_ID configured:', !!envConfig.setu.productInstanceId);

  // Step B: Setu Authentication Test
  console.log('\n2. Testing Setu OAuth Authentication (https://accountservice.setu.co/v1/users/login)...');
  try {
    const token = await setuAuthService.getAccessToken();
    if (token && token.length > 20) {
      console.log('   ✓ SUCCESS: Real Setu Sandbox OAuth access token obtained successfully!');
    } else {
      console.log('   ✗ FAILED: Token returned is empty or invalid.');
      return;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('   ✗ FAILED to authenticate with Setu:', msg);
    return;
  }

  // Step C: Real Setu Consent Creation
  console.log('\n3. Testing Setu Sandbox Consent Creation (POST /consents)...');
  try {
    const consentRes = await setuService.createConsent({
      mobileNumber: '9876543210',
      redirectUrl: 'https://dry-parks-work.loca.lt/aa/callback',
    });

    console.log('   ✓ SUCCESS: Real Setu Consent Created!');
    console.log('   Consent ID:', consentRes.consentId);
    console.log('   Status:', consentRes.status);
    console.log('   Setu Consent URL:', consentRes.redirectUrl);
    console.log('   Valid From:', consentRes.validFrom);
    console.log('   Valid To:', consentRes.validTo);

    console.log('\n4. Testing Setu Consent Status Retrieval (GET /consents/:id)...');
    const statusRes = await setuService.getConsentStatus(consentRes.consentId);
    console.log('   ✓ SUCCESS: Setu Status fetched: status =', statusRes.status);

    console.log('\n======================================================');
    console.log('LIVE SETU SANDBOX HANDSHAKE VERIFIED SUCCESSFULLY! ✓');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('   ✗ FAILED to create consent on Setu Sandbox:', msg);
  }
}

runLiveTest();
