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
    const { domain } = event.queryStringParameters;
    
    if (!domain) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Domain parameter required' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        domain: domain,
        message: 'WHOIS lookup services',
        services: [
          {
            name: 'Whois.com',
            url: `https://www.whois.com/whois/${domain}`,
            description: 'Detailed WHOIS information'
          },
          {
            name: 'Who.is',
            url: `https://who.is/whois/${domain}`,
            description: 'Free WHOIS lookup'
          },
          {
            name: 'ICANN Lookup',
            url: `https://lookup.icann.org/lookup`,
            description: 'Official ICANN WHOIS'
          },
          {
            name: 'Namecheap WHOIS',
            url: `https://www.namecheap.com/domains/whoislookup/?domain=${domain}`,
            description: 'Domain registration details'
          }
        ],
        privacy_note: 'Some domains have WHOIS privacy protection enabled',
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'WHOIS service information',
        message: 'Use external WHOIS services',
        timestamp: new Date().toISOString()
      })
    };
  }
};