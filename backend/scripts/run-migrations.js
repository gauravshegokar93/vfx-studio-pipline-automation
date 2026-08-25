const { sql, config } = require('../config/db');

async function runMigrations() {
    let pool;
    try {
        console.log('Connecting to database...');
        pool = await sql.connect(config);
        console.log('Connected. Running migrations...');

        const queries = [
            `
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Clients')
            BEGIN
                CREATE TABLE Clients (
                    ClientId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                    ClientName NVARCHAR(255) NOT NULL UNIQUE,
                    CreatedAt DATETIME2 DEFAULT GETDATE()
                );
                PRINT 'Created Clients table';
            END
            `,
            `
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Projects') AND name = 'ClientId')
            BEGIN
                ALTER TABLE Projects ADD ClientId UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Clients(ClientId);
                PRINT 'Added ClientId to Projects table';
            END
            `,
            `
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Episodes')
            BEGIN
                CREATE TABLE Episodes (
                    EpisodeId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                    ProjectId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Projects(ProjectId),
                    EpisodeName NVARCHAR(255) NOT NULL,
                    CreatedAt DATETIME2 DEFAULT GETDATE(),
                    UNIQUE(ProjectId, EpisodeName)
                );
                PRINT 'Created Episodes table';
            END
            `,
            `
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Sequences') AND name = 'EpisodeId')
            BEGIN
                ALTER TABLE Sequences ADD EpisodeId UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Episodes(EpisodeId);
                PRINT 'Added EpisodeId to Sequences table';
            END
            `,
            `
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('BidSheetImport') AND name = 'Converted')
            BEGIN
                ALTER TABLE BidSheetImport ADD Converted BIT DEFAULT 0;
                PRINT 'Added Converted to BidSheetImport table';
            END
            `
        ];

        for (const query of queries) {
            await pool.request().query(query);
        }

        console.log('Migrations completed successfully.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

runMigrations();
