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

        console.log('--- Simulating Frontend payload ---');
        const payload = {
            employeeCode: 'TEST-ART-004',
            name: 'Test Artist 4',
            email: 'test.artist4@vfx.com',
            role: 'Artist',
            departmentId: '2',
            teamId: '9',
            leadId: '2',
            username: '',
            password: ''
        };

        const createUserRes = await axios.post(`${API}/users`, payload, { headers: { Authorization: `Bearer ${adminToken}` } });

        console.log('User created:', createUserRes.data);

    } catch (err) {
        console.error('Error:', err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
    }
}
run();
