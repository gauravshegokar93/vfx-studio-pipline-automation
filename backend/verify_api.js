const http = require('http');

function request(method, path, body = null, token = null) {
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

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    body: data ? JSON.parse(data) : null
                });
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    try {
        console.log("--- API_TESTS_START ---");
        
        // 1. Login Test (Artist)
        console.log("1. Testing Login API with test.artist@vfx.com");
        const loginRes = await request('POST', '/api/auth/login', { email: 'test.artist@vfx.com', password: 'Test@12345' });
        let artistToken = null;
        if (loginRes.status === 200 && loginRes.body.success) {
            console.log("-> Login test: Passed");
            artistToken = loginRes.body.accessToken;
        } else {
            console.log("-> Login test: Failed", loginRes.status, loginRes.body);
        }

        // 2. Super Admin Login
        console.log("2. Testing Super Admin Login");
        const adminLogin = await request('POST', '/api/auth/login', { email: 'admin@vfx.com', password: 'Admin@123' });
        let adminToken = null;
        if (adminLogin.status === 200 && adminLogin.body.success) {
            console.log("-> Super Admin Login: Passed");
            adminToken = adminLogin.body.accessToken;
        } else {
            console.log("-> Super Admin Login: Failed. We might not have the correct admin password or it's deactivated.");
        }

        // 3. User Management via Super Admin
        if (adminToken) {
            console.log("3. Super Admin -> User Registry test");
            const usersRes = await request('GET', '/api/users', null, adminToken);
            if (usersRes.status === 200) {
                const users = usersRes.body.data || usersRes.body;
                const testUser = Array.isArray(users) ? users.find(u => u.email === 'test.artist@vfx.com' || u.Email === 'test.artist@vfx.com') : null;
                if (testUser) {
                    console.log("-> Super Admin User Registry test: Passed. Found Test Artist in list.");
                } else {
                    console.log("-> Super Admin User Registry test: Failed. Users:", JSON.stringify(users, null, 2));
                }
            } else {
                console.log("-> Super Admin User Registry test: Failed with status", usersRes.status);
            }
        }

        // 4. Artist Authorization Test
        if (artistToken) {
            console.log("4. Artist Authorization test");
            const userCreateRes = await request('POST', '/api/users', { FullName: 'Hacker', Email: 'h@h.com' }, artistToken);
            console.log(`-> POST /api/users: Expected 403, Got ${userCreateRes.status}`);

            const permRes = await request('PUT', '/api/users/5/permissions', { permissions: [] }, artistToken);
            console.log(`-> PUT /api/users/:id/permissions: Expected 403, Got ${permRes.status}`);
            
            const roleRes = await request('PUT', '/api/roles/5/permissions', { permissions: [] }, artistToken);
            console.log(`-> PUT /api/roles/:id/permissions: Expected 403, Got ${roleRes.status}`);
            
            if (userCreateRes.status === 403 && permRes.status === 403 && roleRes.status === 403) {
                console.log("-> Artist Authorization test: Passed");
            } else {
                console.log("-> Artist Authorization test: Partially failed or missing role checks in routes");
            }
        }

        console.log("--- API_TESTS_END ---");
    } catch (e) {
        console.error(e);
    }
}

runTests();
