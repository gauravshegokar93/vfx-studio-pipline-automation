const sql = require("mssql");
require("dotenv").config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    trustServerCertificate: true
  }
};

async function main() {
  await sql.connect(config);
  console.log("Connected to DB!");
  
  const res = await sql.query("SELECT UserId, EmployeeCode, Name, Email, Role, DepartmentId, LeadId, IsActive FROM Users");
  console.log(JSON.stringify(res.recordset, null, 2));
  process.exit();
}

main().catch(console.error);
