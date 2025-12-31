// server.js - The Alchemist Security Platform
const express = require('express');
const axios = require('axios');
const http = require('http');
const https = require('https');
const dns = require('dns');
const { promisify } = require('util');
const app = express();

// Enable CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    next();
});

// Serve static files from 'public' folder
app.use(express.static('public'));

// ========== 1. HTTP HEADERS CHECKER ==========
app.get('/api/headers', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) return res.json({ error: 'URL required' });
        
        const targetUrl = url.startsWith('http') ? url : `https://${url}`;
        
        const response = await axios.head(targetUrl, {
            timeout: 8000,
            headers: {
                'User-Agent': 'TheAlchemist-Security-Scanner/1.0'
            }
        });
        
        const headers = response.headers;
        const score = calculateSecurityScore(headers);
        
        res.json({
            url: targetUrl,
            status: response.status,
            headers: headers,
            score: score.total,
            maxScore: 10,
            grade: score.grade,
            found: score.found,
            missing: score.missing,
            recommendations: score.recommendations
        });
    } catch (error) {
        res.json({ 
            error: 'Failed to check headers',
            message: error.message,
            tip: 'Try https://example.com format'
        });
    }
});

// ========== 2. SSL CHECKER (Basic) ==========
app.get('/api/ssl', async (req, res) => {
    try {
        const { domain } = req.query;
        if (!domain) return res.json({ error: 'Domain required' });
        
        const sslInfo = await checkSSL(domain);
        res.json(sslInfo);
    } catch (error) {
        res.json({ error: 'SSL check failed', message: error.message });
    }
});
// ========== 3. DNS LOOKUP ==========
app.get('/api/dns', async (req, res) => {
    try {
        const { domain, type = 'A' } = req.query;
        if (!domain) return res.json({ error: 'Domain required' });
        
        const resolveAsync = promisify(dns.resolve);
        const records = await resolveAsync(domain, type);
        
        res.json({
            domain,
            type,
            records,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        // Fallback to system DNS
        try {
            const resolve4Async = promisify(dns.resolve4);
            const resolve6Async = promisify(dns.resolve6);
            const resolveMxAsync = promisify(dns.resolveMx);
            const resolveTxtAsync = promisify(dns.resolveTxt);
            
            let records;
            switch(type) {
                case 'A': records = await resolve4Async(domain); break;
                case 'AAAA': records = await resolve6Async(domain); break;
                case 'MX': records = await resolveMxAsync(domain); break;
                case 'TXT': records = await resolveTxtAsync(domain); break;
                default: records = await resolve4Async(domain);
            }
            
            res.json({
                domain,
                type,
                records,
                source: 'System DNS',
                timestamp: new Date().toISOString()
            });
        } catch (fallbackError) {
            res.json({ 
                error: 'DNS lookup failed',
                message: error.message,
                tip: 'Check domain spelling'
            });
        }
    }
});

// ========== 4. WHOIS LOOKUP (Simple) ==========
app.get('/api/whois', async (req, res) => {
    try {
        const { domain } = req.query;
        if (!domain) return res.json({ error: 'Domain required' });
        
        // Simple WHOIS using external service
        const whoisUrl = `https://www.whois.com/whois/${domain}`;
        
        res.json({
            domain,
            message: 'For detailed WHOIS, visit:',
            url: whoisUrl,
            check_manually: `https://who.is/whois/${domain}`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({ error: 'WHOIS service unavailable', message: error.message });
    }
});
// ========== HELPER FUNCTIONS ==========
function calculateSecurityScore(headers) {
    const securityHeaders = [
        { name: 'Content-Security-Policy', weight: 3 },
        { name: 'Strict-Transport-Security', weight: 2 },
        { name: 'X-Frame-Options', weight: 2 },
        { name: 'X-Content-Type-Options', weight: 1 },
        { name: 'X-XSS-Protection', weight: 1 },
        { name: 'Referrer-Policy', weight: 1 },
        { name: 'Permissions-Policy', weight: 1 }
    ];
    
    let totalScore = 0;
    let found = [];
    let missing = [];
    let recommendations = [];
    
    securityHeaders.forEach(header => {
        const headerName = header.name.toLowerCase();
        if (headers[headerName] || headers[header.name]) {
            totalScore += header.weight;
            found.push({
                name: header.name,
                value: headers[headerName] || headers[header.name]
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
    if (totalScore >= 9) grade = 'A';
    else if (totalScore >= 7) grade = 'B';
    else if (totalScore >= 5) grade = 'C';
    else if (totalScore >= 3) grade = 'D';
    else grade = 'F';
    
    return {
        total: totalScore,
        grade,
        found,
        missing,
        recommendations
    };
}

async function checkSSL(domain) {
    return new Promise((resolve) => {
        const options = {
            hostname: domain,
            port: 443,
            method: 'GET',
            rejectUnauthorized: false,
            timeout: 5000
        };
        
        const req = https.request(options, (res) => {
            const cert = res.socket.getPeerCertificate();
            const protocol = res.socket.getProtocol();
            
            let score = 5; // Base score
            let recommendations = [];
            
            // Check certificate validity
            if (cert.valid_to) {
                const validTo = new Date(cert.valid_to);
                const now = new Date();
                const daysRemaining = Math.ceil((validTo - now) / (1000 * 60 * 60 * 24));
                
                if (daysRemaining < 30) {
                    score -= 2;
                    recommendations.push('Certificate expires soon');
                }
                if (daysRemaining > 365) {
                    score += 1;
                }
            }
            
            // Check protocol
            if (protocol === 'TLSv1.3') {
                score += 2;
            } else if (protocol === 'TLSv1.2') {
                score += 1;
            } else {
                score -= 2;
                recommendations.push('Upgrade to TLS 1.2+');
            }
            
            // Determine grade
            let grade;
            if (score >= 8) grade = 'A';
            else if (score >= 6) grade = 'B';
            else if (score >= 4) grade = 'C';
            else if (score >= 2) grade = 'D';
            else grade = 'F';
            
            resolve({
                domain,
                grade,
                score,
                maxScore: 10,
                protocol,
                issuer: cert.issuer ? cert.issuer.CN : 'Unknown',
                valid_to: cert.valid_to,
                valid_from: cert.valid_from,
                recommendations,
                timestamp: new Date().toISOString()
            });
        });
        
        req.on('error', () => {
            resolve({
                domain,
                grade: 'F',
                score: 0,
                maxScore: 10,
                error: 'Could not establish SSL connection',
                recommendations: ['Check if domain supports HTTPS'],
                timestamp: new Date().toISOString()
            });
        });
        
        req.end();
    });
}
// ========== HEALTH CHECK ==========
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        service: 'The Alchemist Security API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: [
            '/api/headers?url=https://example.com',
            '/api/ssl?domain=example.com',
            '/api/dns?domain=example.com&type=A',
            '/api/whois?domain=example.com'
        ]
    });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 The Alchemist API running on port ${PORT}`);
    console.log(`📡 Local: http://localhost:${PORT}`);
    console.log(`🌐 Headers: http://localhost:${PORT}/api/headers?url=https://example.com`);
    console.log(`🔐 SSL: http://localhost:${PORT}/api/ssl?domain=example.com`);
    console.log(`🌍 Health: http://localhost:${PORT}/api/health`);
});

// Handle unhandled errors
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
});