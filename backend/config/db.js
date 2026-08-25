const sql = require("mssql");
const path = require('path');
// Ensure the correct env file is loaded regardless of the process CWD
require("dotenv").config({ path: path.join(__dirname, "../.env") });


const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    trustServerCertificate: true,
  },
};

module.exports = { sql, config };