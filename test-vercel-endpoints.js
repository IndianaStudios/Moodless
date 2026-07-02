const VERCEL_URL = 'https://moodless.vercel.app';

async function fetchWithoutToken(endpoint, method = 'GET') {
  console.log(`\n--- Testing ${method} ${endpoint} (NO TOKEN) ---`);
  try {
    const res = await fetch(`${VERCEL_URL}${endpoint}`, { method });
    console.log('Status:', res.status);
    const body = await res.text();
    console.log('Body:', body);
  } catch (err) {
    console.error(`Fetch to ${endpoint} failed:`, err);
  }
}

async function fetchWithToken(endpoint, method = 'GET') {
  const token = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2ZDM5Y2FiYTg2MWY1YzYwMmI3YjY0ODk5YjdhYTdhMWYxZmM4NmUiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vbW9vZGxlc3MtNHlvdSIsImF1ZCI6Im1vb2RsZXNzLTR5b3UiLCJhdXRoX3RpbWUiOjE3ODMwMTA1MTEsInVzZXJfaWQiOiJ0ZXN0LXVzZXItdWlkLTEyMzQ1Iiwic3ViIjoidGVzdC11c2VyLXVpZC0xMjM0NSIsImlhdCI6MTc4MzAxMDUxMSwiZXhwIjoxNzgzMDE0MTExLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7fSwic2lnbl9pbl9wcm92aWRlciI6ImN1c3RvbSJ9fQ.g3LfoInxVbsIyzRGeyVHiVpxTOR9LTta0rdPocfdyHIAeNPFrH_JCxTUi4Yxk5lzhB91csYcjKf3IoQI1nxv66LH8YQR5JWZGjW2fZu8RjHVhS-kROnxMCrcFPCytXobYuzUElCmdwSmvQSadfWIXybPbynv7eAHUQP-6Zo6bMyoPfl9lC01xt7aWhDHjF4BySMDlJzppKIfyVOBnsGVDOHWpeemeo_xdl4mn8hkGnEo2ks5UbiV79v1yoPJpREIP94ZCsNPNIVQFEV6mffpCa-J3mL_X3dfDSDT3AnRITnyeyyet27uYJmWrq3Ul0A_aaZtuGM-37KvgWrL9J1hqQ';
  console.log(`\n--- Testing ${method} ${endpoint} (WITH TOKEN) ---`);
  try {
    const res = await fetch(`${VERCEL_URL}${endpoint}`, {
      method,
      headers: { 'Authorization': `Bearer ${token}` },
    });
    console.log('Status:', res.status);
    const body = await res.text();
    console.log('Body:', body);
  } catch (err) {
    console.error(`Fetch to ${endpoint} failed:`, err);
  }
}

async function postWithToken(endpoint, body) {
  const token = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2ZDM5Y2FiYTg2MWY1YzYwMmI3YjY0ODk5YjdhYTdhMWYxZmM4NmUiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vbW9vZGxlc3MtNHlvdSIsImF1ZCI6Im1vb2RsZXNzLTR5b3UiLCJhdXRoX3RpbWUiOjE3ODMwMTA1MTEsInVzZXJfaWQiOiJ0ZXN0LXVzZXItdWlkLTEyMzQ1Iiwic3ViIjoidGVzdC11c2VyLXVpZC0xMjM0NSIsImlhdCI6MTc4MzAxMDUxMSwiZXhwIjoxNzgzMDE0MTExLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7fSwic2lnbl9pbl9wcm92aWRlciI6ImN1c3RvbSJ9fQ.g3LfoInxVbsIyzRGeyVHiVpxTOR9LTta0rdPocfdyHIAeNPFrH_JCxTUi4Yxk5lzhB91csYcjKf3IoQI1nxv66LH8YQR5JWZGjW2fZu8RjHVhS-kROnxMCrcFPCytXobYuzUElCmdwSmvQSadfWIXybPbynv7eAHUQP-6Zo6bMyoPfl9lC01xt7aWhDHjF4BySMDlJzppKIfyVOBnsGVDOHWpeemeo_xdl4mn8hkGnEo2ks5UbiV79v1yoPJpREIP94ZCsNPNIVQFEV6mffpCa-J3mL_X3dfDSDT3AnRITnyeyyet27uYJmWrq3Ul0A_aaZtuGM-37KvgWrL9J1hqQ';
  console.log(`\n--- Testing POST ${endpoint} (WITH TOKEN) ---`);
  try {
    const res = await fetch(`${VERCEL_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body || {}),
    });
    console.log('Status:', res.status);
    const bodyText = await res.text();
    console.log('Body:', bodyText);
  } catch (err) {
    console.error(`Fetch to ${endpoint} failed:`, err);
  }
}

async function run() {
  await fetchWithoutToken('/api/search-youtube?q=Dua%20Lipa%20Levitating');
  await fetchWithToken('/api/search-youtube?q=Dua%20Lipa%20Levitating');
  await postWithToken('/api/generate-ai', { prompt: 'Escribe un poema de 1 linea.' });
}

run();
