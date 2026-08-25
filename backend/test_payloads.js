const http = require('http');

async function apiRequest(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }
        const req = http.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
                } catch(e) {
                    resolve({ status: res.statusCode, body: null, raw: data });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTests() {
    console.log("Testing Login...");
    const loginRes = await apiRequest('POST', '/api/auth/login', { email: 'test.artist@vfx.com', password: 'Test@12345' });
    console.log("Login User Object keys:", loginRes.body?.user ? Object.keys(loginRes.body.user) : null);
    console.log("Login User permissions count:", loginRes.body?.user?.permissions?.length);
    
    const token = loginRes.body?.accessToken;
    if (!token) return console.error("No token");

    console.log("Testing /api/users/me...");
    const meRes = await apiRequest('GET', '/api/users/me', null, token);
    console.log("Me User permissions count:", meRes.body?.user?.permissions?.length);
    
    // Testing unassigned task progress
    console.log("Testing Unassigned Task Progress...");
    // Just a random guid
    const unassignedTaskRes = await apiRequest('PUT', '/api/tasks/12345678-1234-1234-1234-123456789012/progress', { progress: 50 }, token);
    console.log("Unassigned Task status:", unassignedTaskRes.status);
    console.log("Unassigned Task body:", unassignedTaskRes.body || unassignedTaskRes.raw);
}
runTests();
