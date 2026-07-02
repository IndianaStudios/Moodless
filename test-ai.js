const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function testGroq() {
  console.log('Testing Groq with model: openai/gpt-oss-120b and JSON mode...');
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: 'Responde con {"saludo": "hola"} en formato JSON.' }],
        response_format: { type: 'json_object' }
      })
    });
    const data = await res.json();
    console.log('Groq status:', res.status);
    console.log('Groq response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Groq test failed:', err);
  }
}

async function testOpenRouter() {
  console.log('Testing OpenRouter with model: openai/gpt-oss-120b:free...');
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://moodless.vercel.app',
        'X-Title': 'Moodless'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b:free',
        messages: [{ role: 'user', content: 'Hola' }]
      })
    });
    const data = await res.json();
    console.log('OpenRouter status:', res.status);
    console.log('OpenRouter response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('OpenRouter test failed:', err);
  }
}

async function run() {
  await testGroq();
  await testOpenRouter();
}

run();
