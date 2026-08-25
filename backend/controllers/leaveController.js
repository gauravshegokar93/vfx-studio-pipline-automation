const { sql, config } = require('../config/db');

async function submitLeave(req, res) {
    try {
        const userId = req.user.userId;
        const { leaveType, fromDate, toDate, reason, totalDays } = req.body;

        if (!leaveType || !fromDate || !toDate || !reason || !totalDays) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        const pool = await sql.connect(config);

        // Find Supervisor (ReportingManagerId)
        const userResult = await pool.request()
            .input('userId', sql.BigInt, userId)
            .query(`SELECT ReportingManagerId FROM UserMaster WHERE UserId = @userId AND IsActive = 1`);

        let supervisorId = null;
        if (userResult.recordset.length > 0) {
            supervisorId = userResult.recordset[0].ReportingManagerId;
        }

        await pool.request()
            .input('UserId', sql.BigInt, userId)
            .input('SupervisorId', sql.BigInt, supervisorId)
            .input('LeaveType', sql.NVarChar, leaveType)
            .input('Reason', sql.NVarChar, reason)
            .input('FromDate', sql.Date, fromDate)
            .input('ToDate', sql.Date, toDate)
            .input('TotalDays', sql.Int, totalDays)
            .input('Status', sql.NVarChar, 'Pending')
            .input('CreatedBy', sql.BigInt, userId)
            .input('CreatedDate', sql.DateTime, new Date())
            .input('IsDeleted', sql.Bit, 0)
            .query(`
                INSERT INTO LeaveRequest 
                (UserId, SupervisorId, LeaveType, Reason, FromDate, ToDate, TotalDays, Status, CreatedBy, CreatedDate, IsDeleted)
                VALUES 
                (@UserId, @SupervisorId, @LeaveType, @Reason, @FromDate, @ToDate, @TotalDays, @Status, @CreatedBy, @CreatedDate, @IsDeleted)
            `);

        return res.status(201).json({ success: true, message: 'Leave request submitted successfully.' });

    } catch (err) {
        console.error('[submitLeave]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}

async function getLeaves(req, res) {
    try {
        const userId = req.user.userId;
        const role = req.user.roleName;

        const pool = await sql.connect(config);
        
        let query = `
            SELECT l.*, u.FullName as UserName, u.EmployeeCode, d.DepartmentName as DepartmentName 
            FROM LeaveRequest l
            JOIN UserMaster u ON l.UserId = u.UserId
            LEFT JOIN DepartmentMaster d ON u.HomeDepartmentId = d.DepartmentId
            WHERE l.IsDeleted = 0
        `;

        const request = pool.request();

        if (role === 'Artist' || role === 'QC Artist') {
            query += ` AND l.UserId = @UserId`;
            request.input('UserId', sql.BigInt, userId);
        } else if (role === 'Team Lead' || role === 'Project Manager') {
            // Can see their own leaves AND leaves where they are the supervisor
            query += ` AND (l.UserId = @UserId OR l.SupervisorId = @UserId)`;
            request.input('UserId', sql.BigInt, userId);
        } else if (role === 'Department Supervisor') {
            // Can see their own leaves, and anyone in their department
            // Let's get department ID of this user
            const deptRes = await pool.request().input('uid', sql.BigInt, userId).query('SELECT HomeDepartmentId FROM UserMaster WHERE UserId = @uid');
            const deptId = deptRes.recordset[0]?.HomeDepartmentId;
            query += ` AND (l.UserId = @UserId OR u.HomeDepartmentId = @DeptId)`;
            request.input('UserId', sql.BigInt, userId);
            request.input('DeptId', sql.BigInt, deptId);
        }
        // Admin, Super Admin, Production Head see all.

        query += ` ORDER BY l.CreatedDate DESC`;

        const result = await request.query(query);

        const leaves = result.recordset.map(row => ({
            id: row.LeaveId.toString(),
            userId: row.UserId.toString(),
            userName: row.UserName,
            employeeCode: row.EmployeeCode,
            departmentName: row.DepartmentName,
            type: row.LeaveType,
            reason: row.Reason,
            startDate: row.FromDate.toISOString().split('T')[0],
            endDate: row.ToDate.toISOString().split('T')[0],
            totalDays: row.TotalDays,
            status: row.Status,
            remarks: row.Remarks
        }));

        return res.json({ success: true, items: leaves });

    } catch (err) {
        console.error('[getLeaves]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}

async function updateLeaveStatus(req, res) {
    try {
        const leaveId = req.params.id;
        const userId = req.user.userId;
        const role = req.user.roleName;
        const { status, remarks } = req.body;

        if (!status || !['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status.' });
        }

        const pool = await sql.connect(config);

        // Fetch the leave request to verify permissions
        const leaveRes = await pool.request()
            .input('LeaveId', sql.BigInt, leaveId)
            .query(`
                SELECT l.SupervisorId, l.UserId, u.HomeDepartmentId
                FROM LeaveRequest l
                JOIN UserMaster u ON l.UserId = u.UserId
                WHERE l.LeaveId = @LeaveId AND l.IsDeleted = 0
            `);

        if (leaveRes.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Leave request not found.' });
        }

        const leave = leaveRes.recordset[0];
        let canApprove = false;

        if (['Super Admin', 'Admin', 'Production Head'].includes(role)) {
            canApprove = true;
        } else if (role === 'Department Supervisor') {
            const deptRes = await pool.request().input('uid', sql.BigInt, userId).query('SELECT HomeDepartmentId FROM UserMaster WHERE UserId = @uid');
            const userDeptId = deptRes.recordset[0]?.HomeDepartmentId;
            if (userDeptId && userDeptId === leave.HomeDepartmentId) {
                canApprove = true;
            }
        } else if (leave.SupervisorId === userId || leave.UserId === userId) {
            // Requester cannot approve their own leave unless they are their own supervisor (unlikely)
            if (leave.SupervisorId === userId) {
                 canApprove = true;
            }
        }

        if (!canApprove) {
            return res.status(403).json({ success: false, message: 'Unauthorized to approve or reject this leave.' });
        }
        
        let updateQuery = `
            UPDATE LeaveRequest 
            SET Status = @Status, 
                Remarks = @Remarks, 
                ModifiedBy = @UserId, 
                ModifiedDate = @Now
        `;
        
        if (status === 'Approved') {
            updateQuery += `, ApprovedBy = @UserId, ApprovedDate = @Now`;
        } else if (status === 'Rejected') {
            updateQuery += `, RejectedBy = @UserId, RejectedDate = @Now`;
        }

        updateQuery += ` WHERE LeaveId = @LeaveId AND IsDeleted = 0`;

        await pool.request()
            .input('Status', sql.NVarChar, status)
            .input('Remarks', sql.NVarChar, remarks || '')
            .input('UserId', sql.BigInt, userId)
            .input('Now', sql.DateTime, new Date())
            .input('LeaveId', sql.BigInt, leaveId)
            .query(updateQuery);

        return res.json({ success: true, message: `Leave request ${status.toLowerCase()} successfully.` });

    } catch (err) {
        console.error('[updateLeaveStatus]', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}

module.exports = {
    submitLeave,
    getLeaves,
    updateLeaveStatus
};
