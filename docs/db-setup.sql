-- SM rolling FX - SQL Server Setup Script (v1.0)
-- Target: SQL Server Management Studio (SSMS)

-- 1. Create Database
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'SMRollingFX')
BEGIN
    CREATE DATABASE SMRollingFX;
END
GO

USE SMRollingFX;
GO

-- 2. Core Resource Tables
CREATE TABLE Departments (
    DepartmentId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE Users (
    UserId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    EmployeeCode NVARCHAR(50) NOT NULL UNIQUE,
    Name NVARCHAR(255) NOT NULL,
    Email NVARCHAR(255) NOT NULL UNIQUE,
    Role NVARCHAR(50) NOT NULL, -- 'Production Head', 'Department Supervisor', 'Lead', 'Artist'
    DepartmentId UNIQUEIDENTIFIER,
    LeadId UNIQUEIDENTIFIER,
    IsActive BIT DEFAULT 1,
    IsFirstLogin BIT DEFAULT 1,
    AvatarUrl NVARCHAR(MAX),
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (DepartmentId) REFERENCES Departments(DepartmentId)
);

CREATE TABLE UserCredentials (
    CredentialId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL UNIQUE,
    Username NVARCHAR(100) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(MAX) NULL, -- Store hashed passwords here
    TempPassword NVARCHAR(MAX), -- Used for onboarding flow
    LastChangedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
);

-- 3. Production Hierarchy Tables
CREATE TABLE Projects (
    ProjectId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ProjectCode NVARCHAR(20) NOT NULL UNIQUE,
    ProjectName NVARCHAR(255) NOT NULL,
    ClientName NVARCHAR(255),
    Status NVARCHAR(50) DEFAULT 'In-Production',
    StartDate DATE,
    EndDate DATE,
    ThumbnailUrl NVARCHAR(MAX)
);

CREATE TABLE Sequences (
    SequenceId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ProjectId UNIQUEIDENTIFIER NOT NULL,
    SequenceCode NVARCHAR(50) NOT NULL,
    FOREIGN KEY (ProjectId) REFERENCES Projects(ProjectId) ON DELETE CASCADE
);

CREATE TABLE Shots (
    ShotId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    SequenceId UNIQUEIDENTIFIER NOT NULL,
    ShotCode NVARCHAR(100) NOT NULL, -- Primary "Shot Name"
    Status NVARCHAR(50) DEFAULT 'Not Started',
    Priority NVARCHAR(20) DEFAULT 'Medium', -- 'Low', 'Medium', 'High', 'Critical'
    DueDate DATE,
    Description NVARCHAR(MAX),
    FOREIGN KEY (SequenceId) REFERENCES Sequences(SequenceId) ON DELETE CASCADE
);

-- 4. Pipeline & Task Execution
CREATE TABLE Tasks (
    TaskId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ShotId UNIQUEIDENTIFIER NOT NULL,
    PipelineStep NVARCHAR(50) NOT NULL, -- 'Roto', 'Paint', 'Comp', etc.
    TaskName NVARCHAR(255) NOT NULL,
    BidHours FLOAT DEFAULT 0,
    SpentHours FLOAT DEFAULT 0,
    RemainingHours FLOAT DEFAULT 0,
    Status NVARCHAR(50) DEFAULT 'Not Started',
    Progress INT DEFAULT 0,
    InternalEta DATE,
    ReviewStatus NVARCHAR(50) DEFAULT 'Pending',
    StartDate DATE,
    DueDate DATE,
    Priority NVARCHAR(20),
    LatestArtistComment NVARCHAR(MAX),
    LatestLeadComment NVARCHAR(MAX),
    LatestSupComment NVARCHAR(MAX),
    FOREIGN KEY (ShotId) REFERENCES Shots(ShotId) ON DELETE CASCADE
);

CREATE TABLE TaskAssignments (
    AssignmentId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    TaskId UNIQUEIDENTIFIER NOT NULL,
    ArtistId UNIQUEIDENTIFIER,
    LeadId UNIQUEIDENTIFIER,
    SupervisorId UNIQUEIDENTIFIER,
    AssignedAt DATETIME DEFAULT GETDATE(),
    IsCurrent BIT DEFAULT 1,
    FOREIGN KEY (TaskId) REFERENCES Tasks(TaskId) ON DELETE CASCADE,
    FOREIGN KEY (ArtistId) REFERENCES Users(UserId),
    FOREIGN KEY (LeadId) REFERENCES Users(UserId)
);

-- 5. Tracking & Review
CREATE TABLE TimeLogs (
    LogId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    TaskId UNIQUEIDENTIFIER NOT NULL,
    UserId UNIQUEIDENTIFIER NOT NULL,
    StartTime DATETIME NOT NULL,
    EndTime DATETIME,
    TotalMinutes INT DEFAULT 0,
    FOREIGN KEY (TaskId) REFERENCES Tasks(TaskId) ON DELETE CASCADE,
    FOREIGN KEY (UserId) REFERENCES Users(UserId)
);

CREATE TABLE Versions (
    VersionId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    TaskId UNIQUEIDENTIFIER NOT NULL,
    UserId UNIQUEIDENTIFIER NOT NULL,
    VersionNumber INT NOT NULL,
    FilePath NVARCHAR(MAX),
    ReviewStatus NVARCHAR(50),
    ReviewComment NVARCHAR(MAX),
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (TaskId) REFERENCES Tasks(TaskId) ON DELETE CASCADE,
    FOREIGN KEY (UserId) REFERENCES Users(UserId)
);

-- 6. Operational Tables
CREATE TABLE Leaves (
    LeaveId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    StartDate DATE NOT NULL,
    EndDate DATE NOT NULL,
    Type NVARCHAR(50), -- 'Vacation', 'Sick', etc.
    Status NVARCHAR(50) DEFAULT 'Pending',
    FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
);

CREATE TABLE Notifications (
    NotificationId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    Message NVARCHAR(MAX) NOT NULL,
    Type NVARCHAR(50),
    IsRead BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
);

-- 7. Seed Initial Data
INSERT INTO Departments (DepartmentId, Name) VALUES 
(NEWID(), 'Comp'),
(NEWID(), 'Roto'),
(NEWID(), 'Paint'),
(NEWID(), 'CG'),
(NEWID(), 'Matchmove');
GO
