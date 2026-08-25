// const sql = require("mssql");
// require("dotenv").config();

// const config = {
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   server: process.env.DB_SERVER,
//   database: process.env.DB_DATABASE,
//   options: {
//     trustServerCertificate: true
//   }
// };

// sql.connect(config)
// .then(() => {
//   console.log("Database Connected");
//   process.exit();
// })
// .catch(err => {
//   console.log(err);
// });

const { sql, config } = require("./config/db");

async function testDB() {
  try {
    await sql.connect(config);

    console.log("✅ Database Connected Successfully");

    const result = await sql.query("SELECT DB_NAME() AS DatabaseName");

    console.log(result.recordset);

    await sql.close();
  } catch (err) {
    console.error("❌ Database Connection Failed");
    console.error(err);
  }
}

testDB();