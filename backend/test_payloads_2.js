const http = require('http');
const { sql, config } = require('./config/db');

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
    let pool;
    try {
        pool = await sql.connect(config);
        
        // Find Task A and Task B
        const taskARes = await pool.request().query("SELECT TOP 1 TaskID FROM TaskMaster WHERE TaskName = 'Task A' ORDER BY TaskID DESC");
        const taskAId = taskARes.recordset[0].TaskID;
        
        const taskBRes = await pool.request().query("SELECT TOP 1 TaskID FROM TaskMaster WHERE TaskName = 'Task B' ORDER BY TaskID DESC");
        const taskBId = taskBRes.recordset[0].TaskID;

        console.log(`Task A: ${taskAId}, Task B: ${taskBId}`);

        // Login Artist A
        console.log("Testing Login...");
        const loginRes = await apiRequest('POST', '/api/auth/login', { email: 'test.artist@vfx.com', password: 'Test@12345' });
        const token = loginRes.body?.accessToken;
        
        console.log("Artist A -> Task A");
        const resA = await apiRequest('PUT', `/api/tasks/${taskAId}/progress`, { progress: 50 }, token);
        console.log(`Status: ${resA.status} (Expected: 500 or 200, but NOT 403, indicating authorized)`);
        
        console.log("Artist A -> Task B");
        const resB = await apiRequest('PUT', `/api/tasks/${taskBId}/progress`, { progress: 50 }, token);
        console.log(`Status: ${resB.status} (Expected: 403 Forbidden)`);

    } catch (e) {
        console.error(e);
    } finally {
        if (pool) await pool.close();
    }
}
runTests();
