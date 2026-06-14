const BASE = process.env.BASE || 'http://localhost:5000';

async function waitForServer() {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(BASE + '/');
      if (res.ok) return true;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error('Server did not respond in time');
}

async function createUser(suffix) {
  const res = await fetch(BASE + '/user/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `test+${suffix}@example.com`, name: `Test ${suffix}`, image: '' })
  });
  return res.json();
}

async function requestOtp(userId, regionObj) {
  const res = await fetch(BASE + '/user/otp/request', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId, ...regionObj })
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function verifyOtp(userId, otp) {
  const res = await fetch(BASE + '/user/otp/verify', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId, otp })
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function run() {
  console.log('Waiting for server...');
  await waitForServer();

  console.log('Creating South-India user...');
  const south = await createUser('south-' + Date.now());
  const uidS = south.result._id || south.result?.id || south._id || south.result?._id;
  console.log('UserId:', uidS);

  console.log('Requesting OTP (South India) => should use email');
  const resp1 = await requestOtp(uidS, { region: 'Tamil Nadu', country: 'India', countryCode: 'IN' });
  console.log('Response:', resp1.status, resp1.data);
  if (resp1.data.devOtp) {
    console.log('Verifying OTP...', resp1.data.devOtp);
    const v = await verifyOtp(uidS, resp1.data.devOtp);
    console.log('Verify response:', v.status, v.data.message || v.data);
  }

  console.log('Creating Non-South user...');
  const non = await createUser('nonsouth-' + Date.now());
  const uidN = non.result._id || non.result?._id;
  console.log('UserId:', uidN);

  // Save phone for non-south test
  console.log('Saving phone for non-south user');
  await fetch(BASE + `/user/update/${uidN}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone: '+911234567890' })
  });

  console.log('Requesting OTP (Non-South) => should use sms');
  const resp2 = await requestOtp(uidN, { region: 'California', country: 'United States', countryCode: 'US' });
  console.log('Response:', resp2.status, resp2.data);
  if (resp2.data.devOtp) {
    console.log('Verifying OTP...', resp2.data.devOtp);
    const v2 = await verifyOtp(uidN, resp2.data.devOtp);
    console.log('Verify response:', v2.status, v2.data.message || v2.data);
  }

  console.log('Done');
}

run().catch(e => { console.error(e); process.exit(1); });
