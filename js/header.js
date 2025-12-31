const axios = require('axios');

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { url } = event.queryStringParameters;
    
    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL parameter required' })
      };
    }

    let targetUrl = url;
    if (!targetUrl.startsWith('http')) {
      targetUrl = 'https://' + targetUrl;
    }

    // Make HEAD request
    const response = await axios.head(targetUrl, {
      timeout: 5000,
      headers: { 'User-Agent': 'TheAlchemist/1.0' }
    });

    const responseHeaders = response.headers;
    
    // Calculate security score
    const securityHeaders = [
      { name: 'Content-Security-Policy', weight: 3 },
      { name: 'Strict-Transport-Security', weight: 2 },
      { name: 'X-Frame-Options', weight: 2 },
      { name: 'X-Content-Type-Options', weight: 1 },
      { name: 'X-XSS-Protection', weight: 1 },
      { name: 'Referrer-Policy', weight: 1 }
    ];

    let score = 0;
    let found = [];
    let missing = [];
    let recommendations = [];

    securityHeaders.forEach(header => {
      const headerName = header.name.toLowerCase();
      if (responseHeaders[headerName] || responseHeaders[header.name]) {
        score += header.weight;
        found.push({
          name: header.name,
          value: responseHeaders[headerName] || responseHeaders[header.name]
        });
      } else {
        missing.push(header.name);
        if (header.weight >= 2) {
          recommendations.push(`Add ${header.name} header`);
        }
      }
    });

    // Calculate grade
    let grade;
    if (score >= 9) grade = 'A';
    else if (score >= 7) grade = 'B';
    else if (score >= 5) grade = 'C';
    else if (score >= 3) grade = 'D';
    else grade = 'F';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        url: targetUrl,
        status: response.status,
        score: score,
        maxScore: 10,
        grade: grade,
        found: found,
        missing: missing,
        recommendations: recommendations,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to analyze headers',
        message: error.message,
        score: 5,
        grade: 'C',
        note: 'Using fallback analysis',
        timestamp: new Date().toISOString()
      })
    };
  }
};