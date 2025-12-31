exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      status: 'online',
      service: 'The Alchemist Security Platform',
      version: '1.0.0',
      environment: 'Netlify Functions',
      deploy_time: new Date().toISOString(),
      endpoints: {
        headers: '/api/headers?url=https://example.com',
        ssl: '/api/ssl?domain=example.com',
        dns: '/api/dns?domain=example.com&type=A',
        whois: '/api/whois?domain=example.com',
        health: '/api/health'
      },
      note: 'Some features use external services for live data'
    })
  };
};