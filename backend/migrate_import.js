const { sql, config } = require('./config/db');

async function migrate() {
    try {
        await sql.connect(config);
        console.log("Connected");
        
        const queries = [
            "IF COL_LENGTH('ImportBatchRow', 'Project') IS NULL ALTER TABLE ImportBatchRow ADD Project nvarchar(255) NULL;",
            "IF COL_LENGTH('ImportBatchRow', 'Batch') IS NULL ALTER TABLE ImportBatchRow ADD Batch nvarchar(255) NULL;",
            "IF COL_LENGTH('ImportBatchRow', 'Department') IS NULL ALTER TABLE ImportBatchRow ADD Department nvarchar(255) NULL;",
            "IF COL_LENGTH('ImportBatchRow', 'HeadIn') IS NULL ALTER TABLE ImportBatchRow ADD HeadIn int NULL;",
            "IF COL_LENGTH('ImportBatchRow', 'TailOut') IS NULL ALTER TABLE ImportBatchRow ADD TailOut int NULL;",
            "IF COL_LENGTH('ImportBatchRow', 'SOW') IS NULL ALTER TABLE ImportBatchRow ADD SOW nvarchar(MAX) NULL;",
            "IF COL_LENGTH('ImportBatchRow', 'Notes') IS NULL ALTER TABLE ImportBatchRow ADD Notes nvarchar(MAX) NULL;",
            "IF COL_LENGTH('ImportBatchRow', 'Vendor') IS NULL ALTER TABLE ImportBatchRow ADD Vendor nvarchar(255) NULL;",
            "IF COL_LENGTH('ImportBatchRow', 'ThumbnailPath') IS NULL ALTER TABLE ImportBatchRow ADD ThumbnailPath nvarchar(500) NULL;"
        ];

        for (const q of queries) {
            await sql.query(q);
            console.log(`Executed: ${q}`);
        }
        console.log("Migration complete.");
    } catch (err) {
        console.error(err);
    } finally {
        await sql.close();
    }
}
migrate();
