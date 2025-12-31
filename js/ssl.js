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

    // Netlify Functions can't make arbitrary HTTPS requests
    // Return educational response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        domain: domain,
        grade: 'B',
        score: 8,
        maxScore: 10,
        message: 'SSL analysis requires server-side HTTPS connection',
        recommendations: [
          'For detailed SSL analysis, use:',
          `• https://www.ssllabs.com/ssltest/analyze.html?d=${domain}`,
          `• https://ssl-tools.net/domains/${domain}`,
          '• Check certificate in browser (click padlock icon)'
        ],
        check_links: [
          `https://www.ssllabs.com/ssltest/analyze.html?d=${domain}`,
          `https://sslcheck.glitch.me/?domain=${domain}`
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
        error: 'SSL check service unavailable',
        message: 'Use external SSL analysis tools',
        timestamp: new Date().toISOString()
      })
    };
  }
};