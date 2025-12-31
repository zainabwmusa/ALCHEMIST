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

  try {
    const { domain, type = 'A' } = event.queryStringParameters;
    
    if (!domain) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Domain parameter required' })
      };
    }

    // Provide DNS information with educational links
    const dnsTools = {
      'A': `https://dns.google/resolve?name=${domain}&type=A`,
      'AAAA': `https://dns.google/resolve?name=${domain}&type=AAAA`,
      'MX': `https://dns.google/resolve?name=${domain}&type=MX`,
      'TXT': `https://dns.google/resolve?name=${domain}&type=TXT`,
      'NS': `https://dns.google/resolve?name=${domain}&type=NS`
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        domain: domain,
        type: type,
        message: 'DNS lookup tools',
        online_tools: [
          `Google DNS: ${dnsTools[type] || `https://dns.google/resolve?name=${domain}`}`,
          `Cloudflare: https://cloudflare-dns.com/dns-query?name=${domain}&type=${type}`,
          `Quad9: https://dns.quad9.net:5053/dns-query?name=${domain}&type=${type}`
        ],
        command_line: [
          `dig ${domain} ${type}`,
          `nslookup -type=${type} ${domain}`
        ],
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'DNS service information',
        message: 'Use public DNS tools for live queries',
        timestamp: new Date().toISOString()
      })
    };
  }
};