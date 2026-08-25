const { sql, config } = require('../config/db');
const bcrypt = require('bcrypt');

async function convertImports() {
    let pool;
    let transaction;
    try {
        pool = await sql.connect(config);
        
        // Fetch all unconverted rows
        const fetchResult = await pool.request().query(`
            SELECT * FROM BidSheetImport 
            WHERE Converted = 0 OR Converted IS NULL
        `);
        const rows = fetchResult.recordset;

        if (rows.length === 0) {
            return { convertedRows: 0, message: 'No rows to convert' };
        }

        // Generate password hash for auto-created users once
        const defaultPassword = 'SMFX123!';
        const passwordHash = await bcrypt.hash(defaultPassword, 10);

        transaction = new sql.Transaction(pool);
        await transaction.begin();

        let convertedCount = 0;

        // Cache for departments
        const deptsResult = await new sql.Request(transaction).query("SELECT DepartmentId, Name FROM Departments");
        const departments = deptsResult.recordset;
        const getDeptIdByName = (name) => {
            const d = departments.find(x => x.Name.toLowerCase() === name.toLowerCase());
            return d ? d.DepartmentId : null;
        };

        for (const row of rows) {
            // Parse project code and name from ShotName (e.g. MPN_R01_SH0040 -> MPN)
            const rawShotName = row.ShotName || 'UNKNOWN_SHOT';
            const parts = rawShotName.split('_');
            const projectCode = parts.length > 0 ? parts[0].trim().toUpperCase() : 'UNKNOWN';
            const projectName = projectCode + ' Project';
            
            // Client name
            const clientName = row.ClientShotName || projectCode;
            
            // Episode name
            const episodeVal = row.Episode || '1';
            const episodeName = episodeVal.toString().startsWith('EP_') || episodeVal.toString().startsWith('SEQ_') ? episodeVal.toString() : 'EP_' + episodeVal;
            const sequenceCode = episodeVal.toString().startsWith('SEQ_') ? episodeVal.toString() : 'SEQ_' + episodeVal;

            // 0. Find or create Client
            let clientId;
            const clientCheckReq = new sql.Request(transaction);
            const clientCheck = await clientCheckReq.input('ClientName', sql.NVarChar(255), clientName)
                                                    .query('SELECT ClientId FROM Clients WHERE ClientName = @ClientName');
            
            if (clientCheck.recordset.length > 0) {
                clientId = clientCheck.recordset[0].ClientId;
            } else {
                const clientInsertReq = new sql.Request(transaction);
                const clientInsert = await clientInsertReq.input('ClientName', sql.NVarChar(255), clientName)
                                                          .query(`
                                                              INSERT INTO Clients (ClientName)
                                                              OUTPUT INSERTED.ClientId
                                                              VALUES (@ClientName)
                                                          `);
                clientId = clientInsert.recordset[0].ClientId;
            }

            // 1. Find or create Project
            let projectId;
            const projCheckReq = new sql.Request(transaction);
            const projCheck = await projCheckReq.input('ProjectCode', sql.NVarChar(50), projectCode)
                                                .query('SELECT ProjectId FROM Projects WHERE ProjectCode = @ProjectCode');
            
            if (projCheck.recordset.length > 0) {
                projectId = projCheck.recordset[0].ProjectId;
            } else {
                const projInsertReq = new sql.Request(transaction);
                const projInsert = await projInsertReq.input('ProjectCode', sql.NVarChar(50), projectCode)
                                                      .input('ProjectName', sql.NVarChar(255), projectName)
                                                      .input('ClientName', sql.NVarChar(255), clientName)
                                                      .input('ClientId', sql.UniqueIdentifier, clientId)
                                                      .input('Status', sql.NVarChar(50), 'In-Production')
                                                      .query(`
                                                          INSERT INTO Projects (ProjectCode, ProjectName, ClientName, ClientId, Status)
                                                          OUTPUT INSERTED.ProjectId
                                                          VALUES (@ProjectCode, @ProjectName, @ClientName, @ClientId, @Status)
                                                      `);
                projectId = projInsert.recordset[0].ProjectId;
            }

            // 2. Find or create Episode
            let episodeId;
            const epCheckReq = new sql.Request(transaction);
            const epCheck = await epCheckReq.input('ProjectId', sql.UniqueIdentifier, projectId)
                                            .input('EpisodeName', sql.NVarChar(255), episodeName)
                                            .query('SELECT EpisodeId FROM Episodes WHERE ProjectId = @ProjectId AND EpisodeName = @EpisodeName');
            
            if (epCheck.recordset.length > 0) {
                episodeId = epCheck.recordset[0].EpisodeId;
            } else {
                const epInsertReq = new sql.Request(transaction);
                const epInsert = await epInsertReq.input('ProjectId', sql.UniqueIdentifier, projectId)
                                                  .input('EpisodeName', sql.NVarChar(255), episodeName)
                                                  .query(`
                                                      INSERT INTO Episodes (ProjectId, EpisodeName)
                                                      OUTPUT INSERTED.EpisodeId
                                                      VALUES (@ProjectId, @EpisodeName)
                                                  `);
                episodeId = epInsert.recordset[0].EpisodeId;
            }

            // 3. Find or create Sequence
            let sequenceId;
            const seqCheckReq = new sql.Request(transaction);
            const seqCheck = await seqCheckReq.input('ProjectId', sql.UniqueIdentifier, projectId)
                                              .input('EpisodeId', sql.UniqueIdentifier, episodeId)
                                              .input('SequenceCode', sql.NVarChar(50), sequenceCode)
                                              .query('SELECT SequenceId FROM Sequences WHERE ProjectId = @ProjectId AND SequenceCode = @SequenceCode');
            
            if (seqCheck.recordset.length > 0) {
                sequenceId = seqCheck.recordset[0].SequenceId;
            } else {
                const seqInsertReq = new sql.Request(transaction);
                const seqInsert = await seqInsertReq.input('ProjectId', sql.UniqueIdentifier, projectId)
                                                    .input('EpisodeId', sql.UniqueIdentifier, episodeId)
                                                    .input('SequenceCode', sql.NVarChar(50), sequenceCode)
                                                    .query(`
                                                        INSERT INTO Sequences (ProjectId, EpisodeId, SequenceCode)
                                                        OUTPUT INSERTED.SequenceId
                                                        VALUES (@ProjectId, @EpisodeId, @SequenceCode)
                                                    `);
                sequenceId = seqInsert.recordset[0].SequenceId;
            }

            // 3. Find or create Shot
            let shotId;
            const shotCheckReq = new sql.Request(transaction);
            const shotCheck = await shotCheckReq.input('SequenceId', sql.UniqueIdentifier, sequenceId)
                                                .input('ShotCode', sql.NVarChar(100), rawShotName)
                                                .query('SELECT ShotId FROM Shots WHERE SequenceId = @SequenceId AND ShotCode = @ShotCode');
            
            if (shotCheck.recordset.length > 0) {
                shotId = shotCheck.recordset[0].ShotId;
            } else {
                const shotInsertReq = new sql.Request(transaction);
                const priority = row.Complexity || 'Medium';
                const status = row.Status || 'Not Started';
                const dueDate = row.ETA || row.DeliveryDate || null;
                const desc = row.VFXWorkDescription || null;

                const shotInsert = await shotInsertReq.input('SequenceId', sql.UniqueIdentifier, sequenceId)
                                                      .input('ShotCode', sql.NVarChar(100), rawShotName)
                                                      .input('Priority', sql.NVarChar(20), priority)
                                                      .input('Status', sql.NVarChar(50), status)
                                                      .input('DueDate', sql.Date, dueDate)
                                                      .input('Description', sql.NVarChar(sql.MAX), desc)
                                                      .query(`
                                                          INSERT INTO Shots (SequenceId, ShotCode, Priority, Status, DueDate, Description)
                                                          OUTPUT INSERTED.ShotId
                                                          VALUES (@SequenceId, @ShotCode, @Priority, @Status, @DueDate, @Description)
                                                      `);
                shotId = shotInsert.recordset[0].ShotId;
            }

            // 4. Resolve Lead and Artist Users
            let leadId = null;
            let artistId = null;

            // Helper to lookup a user in the transaction
            const lookupUser = async (name) => {
                if (!name) return null;
                const trimmedName = name.trim();
                if (!trimmedName) return null;

                const userCheckReq = new sql.Request(transaction);
                const userCheck = await userCheckReq.input('Name', sql.NVarChar(255), trimmedName)
                                                    .query('SELECT UserId FROM Users WHERE Name = @Name');
                
                if (userCheck.recordset.length > 0) {
                    return userCheck.recordset[0].UserId;
                }
                return null;
            };

            if (row.Lead) {
                leadId = await lookupUser(row.Lead);
            }
            if (row.Artist) {
                artistId = await lookupUser(row.Artist);
            }

            // 5. Create Tasks based on bid hours
            const tasksToCreate = [];
            if (row.RotoBid > 0) tasksToCreate.push({ step: 'Roto', bid: row.RotoBid, dept: 'Roto' });
            if (row.PaintBid > 0) tasksToCreate.push({ step: 'Paint', bid: row.PaintBid, dept: 'Paint' });
            if (row.CompBid > 0) tasksToCreate.push({ step: 'Comp', bid: row.CompBid, dept: 'Comp' });
            if (row.CGBid > 0) tasksToCreate.push({ step: 'CG', bid: row.CGBid, dept: 'CG' });
            if (row.RetimeRepo > 0) tasksToCreate.push({ step: 'Retime', bid: row.RetimeRepo, dept: 'Comp' });

            for (const t of tasksToCreate) {
                let taskId;
                const taskCheckReq = new sql.Request(transaction);
                const taskCheck = await taskCheckReq.input('ShotId', sql.UniqueIdentifier, shotId)
                                                    .input('PipelineStep', sql.NVarChar(50), t.step)
                                                    .query('SELECT TaskId FROM Tasks WHERE ShotId = @ShotId AND PipelineStep = @PipelineStep');
                
                if (taskCheck.recordset.length > 0) {
                    taskId = taskCheck.recordset[0].TaskId;
                } else {
                    taskId = require('crypto').randomUUID();
                    const taskInsertReq = new sql.Request(transaction);
                    const taskName = t.step + ' Task';
                    const taskStatus = (artistId || leadId) ? 'Assigned' : 'Not Started';

                    await taskInsertReq.input('TaskId', sql.UniqueIdentifier, taskId)
                                       .input('ShotId', sql.UniqueIdentifier, shotId)
                                       .input('PipelineStep', sql.NVarChar(50), t.step)
                                       .input('TaskName', sql.NVarChar(255), taskName)
                                       .input('BidHours', sql.Float, t.bid)
                                       .input('Status', sql.NVarChar(50), taskStatus)
                                       .query(`
                                           INSERT INTO Tasks (TaskId, ShotId, PipelineStep, TaskName, BidHours, Status, SpentHours, RemainingHours, Progress, ReviewStatus)
                                           VALUES (@TaskId, @ShotId, @PipelineStep, @TaskName, @BidHours, @Status, 0, 0, 0, 'Pending')
                                       `);
                }

                // 6. Create Task Assignments if Lead or Artist are defined
                if (leadId || artistId) {
                    const assignCheckReq = new sql.Request(transaction);
                    const assignCheck = await assignCheckReq.input('TaskId', sql.UniqueIdentifier, taskId)
                                                            .query('SELECT AssignmentId FROM TaskAssignments WHERE TaskId = @TaskId AND IsCurrent = 1');
                    
                    if (assignCheck.recordset.length === 0) {
                        const assignInsertReq = new sql.Request(transaction);
                        const assignId = require('crypto').randomUUID();
                        await assignInsertReq.input('AssignmentId', sql.UniqueIdentifier, assignId)
                                             .input('TaskId', sql.UniqueIdentifier, taskId)
                                             .input('ArtistId', sql.UniqueIdentifier, artistId)
                                             .input('LeadId', sql.UniqueIdentifier, leadId)
                                             .query(`
                                                 INSERT INTO TaskAssignments (AssignmentId, TaskId, ArtistId, LeadId, IsCurrent)
                                                 VALUES (@AssignmentId, @TaskId, @ArtistId, @LeadId, 1)
                                             `);
                    }
                }
            }

            // Mark this staging row as converted
            const updateReq = new sql.Request(transaction);
            await updateReq.input('RowId', sql.Int, row.Id)
                           .query('UPDATE BidSheetImport SET Converted = 1 WHERE Id = @RowId');
            
            convertedCount++;
        }

        await transaction.commit();
        return { convertedRows: convertedCount, message: 'Conversion successful' };

    } catch (e) {
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (rollbackErr) {
                console.error('Error rolling back conversion transaction:', rollbackErr);
            }
        }
        throw e;
    }
}

module.exports = {
    convertImports
};
