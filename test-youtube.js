const apiKey = process.env.YOUTUBE_API_KEY;
const q = "Dua Lipa Levitating";

async function testYoutube() {
  console.log('Testing YouTube Search with key...');
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q + " official audio")}&type=video&videoEmbeddable=true&maxResults=1&key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log('YouTube response status:', response.status);
    console.log('YouTube response data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('YouTube test failed:', err);
  }
}

testYoutube();
