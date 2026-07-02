const token = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2ZDM5Y2FiYTg2MWY1YzYwMmI3YjY0ODk5YjdhYTdhMWYxZmM4NmUiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vbW9vZGxlc3MtNHlvdSIsImF1ZCI6Im1vb2RsZXNzLTR5b3UiLCJhdXRoX3RpbWUiOjE3ODMwMTA1MTEsInVzZXJfaWQiOiJ0ZXN0LXVzZXItdWlkLTEyMzQ1Iiwic3ViIjoidGVzdC11c2VyLXVpZC0xMjM0NSIsImlhdCI6MTc4MzAxMDUxMSwiZXhwIjoxNzgzMDE0MTExLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7fSwic2lnbl9pbl9wcm92aWRlciI6ImN1c3RvbSJ9fQ.g3LfoInxVbsIyzRGeyVHiVpxTOR9LTta0rdPocfdyHIAeNPFrH_JCxTUi4Yxk5lzhB91csYcjKf3IoQI1nxv66LH8YQR5JWZGjW2fZu8RjHVhS-kROnxMCrcFPCytXobYuzUElCmdwSmvQSadfWIXybPbynv7eAHUQP-6Zo6bMyoPfl9lC01xt7aWhDHjF4BySMDlJzppKIfyVOBnsGVDOHWpeemeo_xdl4mn8hkGnEo2ks5UbiV79v1yoPJpREIP94ZCsNPNIVQFEV6mffpCa-J3mL_X3dfDSDT3AnRITnyeyyet27uYJmWrq3Ul0A_aaZtuGM-37KvgWrL9J1hqQ';

async function testGenerateAI() {
  console.log('\n--- Testing /api/generate-ai with token ---');
  try {
    const res = await fetch('http://localhost:3000/api/generate-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ prompt: 'Escribe un poema de 1 linea.' })
    });
    console.log('Status:', res.status);
    const body = await res.text();
    console.log('Body:', body);
  } catch (err) {
    console.error('Fetch to /api/generate-ai failed:', err);
  }
}

async function testSearchYoutube() {
  console.log('\n--- Testing /api/search-youtube with token ---');
  try {
    const res = await fetch('http://localhost:3000/api/search-youtube?q=Dua%20Lipa%20Levitating', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Status:', res.status);
    const body = await res.text();
    console.log('Body:', body);
  } catch (err) {
    console.error('Fetch to /api/search-youtube failed:', err);
  }
}

async function run() {
  await testGenerateAI();
  await testSearchYoutube();
}

run();
