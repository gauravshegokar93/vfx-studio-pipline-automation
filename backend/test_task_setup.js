const { sql, config } = require('./config/db');

async function setup() {
    let pool;
    try {
        pool = await sql.connect(config);
        
        // Use manual ids instead of identity if UserMaster SEQ_UserId is used, wait I can just query
        const req = pool.request();
        
        // Wait, TaskMaster has Identity? Let's assume yes.
        const res1 = await req.query(`
            INSERT INTO TaskMaster (TaskName, EstimatedHours, IsActive) VALUES ('Task A', 10, 1);
            SELECT SCOPE_IDENTITY() as TaskAId;
        `);
        const taskA = res1.recordset[0].TaskAId;
        
        await req.query(`INSERT INTO TaskAssignment (TaskID, UserID) VALUES (${taskA}, 5)`);
        
        const res2 = await req.query(`
            INSERT INTO TaskMaster (TaskName, EstimatedHours, IsActive) VALUES ('Task B', 10, 1);
            SELECT SCOPE_IDENTITY() as TaskBId;
        `);
        const taskB = res2.recordset[0].TaskBId;
        
        const userReq = pool.request();
        const res3 = await userReq.query(`
            DECLARE @NewId bigint = (SELECT MAX(UserId) FROM UserMaster) + 1;
            INSERT INTO UserMaster (UserId, FullName, Email, EmployeeCode, RoleId, IsActive) 
            VALUES (@NewId, 'Artist B', 'b@vfx.com', 'ARTB', 5, 1);
            SELECT @NewId as UserB;
        `);
        const userB = res3.recordset[0].UserB;
        
        await req.query(`INSERT INTO TaskAssignment (TaskID, UserID) VALUES (${taskB}, ${userB})`);
        
        console.log({ taskA, taskB, userB });
        
    } catch(e) {
        console.error(e);
    } finally {
        if (pool) await pool.close();
    }
}
setup();
