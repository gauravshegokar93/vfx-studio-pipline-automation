const axios = require('axios');
const jwt = require('jsonwebtoken');

const API = 'http://localhost:5000/api';
const JWT_SECRET = 'mysecretkey'; // From .env

async function run() {
    try {
        const adminToken = jwt.sign(
            {
              userId: 1,
              roleId: 1,
              roleName: 'Super Admin',
              departmentId: 1,
              teamId: 1,
            },
            JWT_SECRET,
            { expiresIn: '2h' }
        );

        console.log('--- TEST A: Creating user with empty password ---');
        try {
            await axios.post(`${API}/users`, {
                employeeCode: 'TEST-ART-005',
                name: 'Test Artist 5',
                email: 'test.artist5@vfx.com',
                role: 'Artist',
                departmentId: '2',
                teamId: '9',
                leadId: '2',
                password: '' // empty password
            }, { headers: { Authorization: `Bearer ${adminToken}` } });
            console.log('TEST A FAILED: Should have thrown 400 validation error!');
        } catch (err) {
            console.log(`TEST A SUCCESS: Caught expected error -> Status ${err.response?.status}, Message: ${JSON.stringify(err.response?.data)}`);
        }

        console.log('\n--- TEST B: Creating user with valid password ---');
        let createUserRes;
        try {
            createUserRes = await axios.post(`${API}/users`, {
                employeeCode: 'TEST-ART-005',
                name: 'Test Artist 5',
                email: 'test.artist5@vfx.com',
                role: 'Artist',
                departmentId: '2',
                teamId: '9',
                leadId: '2',
                password: 'Test@12345'
            }, { headers: { Authorization: `Bearer ${adminToken}` } });
            console.log(`TEST B SUCCESS: Created user. Response: ${JSON.stringify(createUserRes.data)}`);
        } catch (err) {
            console.error('TEST B FAILED:', err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
            return;
        }

        console.log('\n--- TEST D & E: Logging in as Test Artist 5 ---');
        const artistRes = await axios.post(`${API}/auth/login`, {
            email: 'test.artist5@vfx.com',
            password: 'Test@12345'
        });

        console.log('TEST D & E SUCCESS: Artist Login Response:', JSON.stringify(artistRes.data.user, null, 2));

    } catch (err) {
        console.error('Error in script execution:', err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
    }
}
run();
