const bcrypt = require('bcrypt');
const { sql, config } = require('./config/db');

async function testPassword() {
    try {
        const pool = await sql.connect(config);
        const users = await pool.request().query("SELECT Email, PasswordHash FROM UserMaster");
        
        const passwords = [
            'password123', 'password', 'admin', 'admin123', 'Admin123', 'Admin@123', '123456', '12345678', 'password@123', 'smfx123', 'vfx123', 'smfx', 'vfx', 'user', 'artist'
        ];
        
        for (const user of users.recordset) {
            console.log("Checking", user.Email);
            for (const p of passwords) {
                if (await bcrypt.compare(p, user.PasswordHash)) {
                    console.log(`FOUND: ${user.Email} -> ${p}`);
                    break;
                }
            }
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
testPassword();
