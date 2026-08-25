const jwt = require('jsonwebtoken');
const http = require('http');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const token = jwt.sign({
  userId: 1,
  roleId: 1,
  roleName: 'Admin',
  departmentId: 1,
  teamId: 1
}, JWT_SECRET, { expiresIn: '2h' });

console.log("Generated Admin Token");

async function test() {
  const endpoints = ['/api/users', '/api/roles', '/api/permissions', '/api/departments', '/api/teams'];
  for (const path of endpoints) {
    const opts = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    };
    await new Promise(resolve => {
      const req = http.request(opts, (res) => {
        console.log(`GET ${path} -> ${res.statusCode}`);
        resolve();
      });
      req.end();
    });
  }
}
test();
