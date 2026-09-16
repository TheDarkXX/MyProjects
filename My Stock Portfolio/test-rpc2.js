import fetch from 'node-fetch'; // Or native fetch

async function run() {
  const link = 'https://news.google.com/rss/articles/CBMigwJBVV95cUxQZmdkYi12WkZDUGxLWmdhMmQxWE9ERE96Y0tfSHZDbFFNbTlqMXFXWVAyRHkyZWF0bS1yZEFTc1FXWHY3eUJpSzEzNkFpeG5tYlRMM2dfaVJyRnNKaXF3cUlSaTV3U3JVSzJsQzF4UmRSQ2RLWDdoRVBDSE1UNk9KMTNmYzg3dHl5cEpCb0hocElZQUJ5eVRqbU0zOWk0TThQZ2pYaDIzYjltTGxUMDNOSUtHa0ZuLTlzUDh5a2Y5a1Z3Z0YwWFNqM0lUZEZKS2w4OUFET0pqX0tzVVlxWi05eUtMaFJVeDdzcEkzYkpuUFZER0stby1wUnlnMVJaMS1vZ19v?oc=5';
  const match = link.match(/articles\/(CBMi[a-zA-Z0-9_-]+|CAIi[a-zA-Z0-9_-]+)/);
  const articleId = match[1];
  
  const initRes = await fetch('https://news.google.com/rss/articles/' + articleId, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await initRes.text();
  
  const sigMatch = html.match(/data-n-a-sg="([^"]+)"/);
  const tsMatch = html.match(/data-n-a-ts="([^"]+)"/);
  console.log('sig:', sigMatch?.[1], 'ts:', tsMatch?.[1]);
  
  const reqPayload = JSON.stringify(['Fbv4je', JSON.stringify(['garturlreq', [['en-US', 'US', ['ARTICLES', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 1], null, null, null, null, null, null, null, null, null, 0, 0], articleId, Number(tsMatch?.[1]), sigMatch?.[1]]])]);
  const body = 'f.req=' + encodeURIComponent(JSON.stringify([[JSON.parse(reqPayload)]]));
  
  const rpcRes = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'User-Agent': 'Mozilla/5.0' }, body });
  const text = await rpcRes.text();
  console.log('rpcText length:', text.length);
  console.log('rpcText snippet:', text.slice(0, 1000));
}
run();
