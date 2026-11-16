const { sql, config } = require('./backend/config/db');
sql.connect(config).then(async pool => {
  const q = `SELECT obj.name AS FK_NAME, tab1.name AS [table], col1.name AS [column], tab2.name AS [referenced_table], col2.name AS [referenced_column] FROM sys.foreign_key_columns fkc INNER JOIN sys.objects obj ON obj.object_id = fkc.constraint_object_id INNER JOIN sys.tables tab1 ON tab1.object_id = fkc.parent_object_id INNER JOIN sys.columns col1 ON col1.column_id = parent_column_id AND col1.object_id = tab1.object_id INNER JOIN sys.tables tab2 ON tab2.object_id = fkc.referenced_object_id INNER JOIN sys.columns col2 ON col2.column_id = referenced_column_id AND col2.object_id = tab2.object_id WHERE tab2.name='TaskAssignment'`;
  const r = await pool.request().query(q);
  console.log('Tables referencing TaskAssignment:', r.recordset);
  process.exit(0);
}).catch(console.error);
