require('dotenv').config();
const jwt = require('jsonwebtoken');
const axios = require('axios');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

const token = jwt.sign({
  userId: 1,
  roleId: 2,
  roleName: 'Team Lead',
  departmentId: 1,
  departmentName: 'Roto',
  teamId: 1,
  teamName: 'Roto Team'
}, JWT_SECRET, { expiresIn: '1h' });

async function run() {
  try {
    const resTasks = await axios.get('http://localhost:5001/api/tasks', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("GET /api/tasks SUCCESS:", resTasks.status);
  } catch (err) {
    if (err.response) {
      console.error(`FAILED with status ${err.response.status}:`, err.response.data);
    } else {
      console.error(err.message);
    }
  }
}

run();
