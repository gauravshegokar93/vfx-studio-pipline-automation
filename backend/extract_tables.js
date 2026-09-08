const fs = require('fs');
const data = JSON.parse(fs.readFileSync('tables_schema.json', 'utf-8'));
const tables = ['ImportBatch', 'ImportBatchDetail', 'ImportBatchRow', 'ProjectMaster', 'ReelMaster', 'ShotMaster', 'TaskMaster', 'DepartmentMaster', 'TeamMaster', 'UserMaster', 'TimeLog', 'TaskAssignment'];
const out = {};
for (const t of tables) {
    if (data[t]) out[t] = data[t];
}
fs.writeFileSync('selected_tables.json', JSON.stringify(out, null, 2));
