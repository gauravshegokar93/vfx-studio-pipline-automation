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
    console.log("Testing /api/users with Team Lead token...");
    const resUsers = await axios.get('http://localhost:5000/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("GET /api/users SUCCESS:", resUsers.status);
    
    console.log("Testing /api/tasks with Team Lead token...");
    const resTasks = await axios.get('http://localhost:5000/api/tasks', {
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
