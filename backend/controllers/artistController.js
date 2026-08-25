const { sql, config } = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const SHIFT_OPTIONS = ["Day", "Evening", "Night"];
const STATUS_OPTIONS = ["Active", "Inactive"];

function normalizeStatus(status) {
  if (!status) return "Active";
  const s = String(status).trim();
  return s;
}

async function withDb(callback) {
  const pool = await sql.connect(config);
  try {
    return await callback(pool);
  } finally {
    // Intentionally keep connection pooling handled by mssql.
    // Do not close pool here.
  }
}

function requireAllowedRole(user) {
  const role = user?.role;
  return role === "Production Head" || role === "Department Supervisor";
}

function canDepartmentHeadCreateForDept(user, departmentId) {
  if (user?.role !== "Department Supervisor") return true; // PH can create for any dept
  return String(user.departmentId) === String(departmentId);
}

// Auto-generation: EmployeeId like ART-000001 using a counter table.
async function getNextEmployeeCode(pool) {
  const request = pool.request();
  request.input("prefix", sql.NVarChar, "ART-");

  // Uses a simple counter table. If it doesn't exist yet, we create it.
  // This keeps the feature self-contained for future deployments.
  await request.query(`
    IF OBJECT_ID('dbo.EmployeeCodeCounters', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.EmployeeCodeCounters (
        CounterName NVARCHAR(100) NOT NULL PRIMARY KEY,
        CurrentValue BIGINT NOT NULL DEFAULT 0
      );
      INSERT INTO dbo.EmployeeCodeCounters (CounterName, CurrentValue)
      VALUES ('ART', 0);
    END
    ELSE
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM dbo.EmployeeCodeCounters WHERE CounterName = 'ART')
        INSERT INTO dbo.EmployeeCodeCounters (CounterName, CurrentValue) VALUES ('ART', 0);
    END
  `);

  const result = await request.query(`
    UPDATE dbo.EmployeeCodeCounters
    SET CurrentValue = CurrentValue + 1
    OUTPUT inserted.CurrentValue
    WHERE CounterName = 'ART';
  `);

  const nextVal = result?.recordset?.[0]?.CurrentValue;
  const padded = String(nextVal).padStart(6, "0");
  return `ART-${padded}`;
}

async function createArtist(req, res) {
  const user = req.user;
  if (!requireAllowedRole(user)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const { fullName, email, departmentId, shift } = req.body || {};

  if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
    return res.status(400).json({ success: false, message: "Full Name is required" });
  }
  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }
  if (!departmentId || typeof departmentId !== "string") {
    return res.status(400).json({ success: false, message: "Department is required" });
  }
  if (!shift || typeof shift !== "string" || !shift.trim()) {
    return res.status(400).json({ success: false, message: "Shift is required" });
  }
  if (!SHIFT_OPTIONS.includes(shift)) {
    return res.status(400).json({ success: false, message: "Invalid Shift" });
  }

  if (!canDepartmentHeadCreateForDept(user, departmentId)) {
    return res.status(403).json({ success: false, message: "Forbidden for this department" });
  }

  return withDb(async (pool) => {
    const employeeCode = await getNextEmployeeCode(pool);

    const request = pool.request();
    request.input("EmployeeCode", sql.NVarChar, employeeCode);
    request.input("FullName", sql.NVarChar, fullName.trim());
    request.input("Email", sql.NVarChar, email.trim().toLowerCase());
    request.input("DepartmentId", sql.BigInt, departmentId);
    request.input("Shift", sql.NVarChar, shift);
    request.input("IsActive", sql.Bit, 1);

    try {
      const result = await request.query(`
        INSERT INTO Artists (EmployeeCode, FullName, Email, DepartmentId, Shift, IsActive)
        OUTPUT inserted.ArtistId AS id, inserted.EmployeeCode, inserted.FullName, inserted.Email, inserted.DepartmentId, inserted.Shift, inserted.IsActive
        VALUES (@EmployeeCode, @FullName, @Email, @DepartmentId, @Shift, @IsActive);
      `);

      return res.status(201).json({ success: true, artist: result.recordset[0] });
    } catch (err) {
      // Unique constraint (Email) / EmployeeCode collision
      return res.status(409).json({ success: false, message: "Employee ID or Email already exists" });
    }
  });
}

async function getArtists(req, res) {
  const user = req.user;

  const { q, departmentId, status, shift, page = 1, pageSize = 20 } = req.query || {};
  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const size = Math.min(100, Math.max(1, parseInt(String(pageSize), 10) || 20));
  const offset = (pageNum - 1) * size;

  const where = [];
  const request = (await sql.connect(config)).request();

  if (!requireAllowedRole(user)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  if (user?.role === "Department Supervisor") {
    where.push("a.DepartmentId = @RequesterDeptId");
    request.input("RequesterDeptId", sql.BigInt, user.departmentId);
  }

  if (departmentId) {
    if (user?.role === "Department Supervisor" && String(departmentId) !== String(user.departmentId)) {
      return res.status(403).json({ success: false, message: "Forbidden for this department" });
    }
    where.push("a.DepartmentId = @DepartmentId");
    request.input("DepartmentId", sql.BigInt, departmentId);
  }

  if (status) {
    const normalized = String(status);
    if (!STATUS_OPTIONS.includes(normalized)) {
      return res.status(400).json({ success: false, message: "Invalid Status" });
    }
    where.push("a.IsActive = @IsActive");
    request.input("IsActive", sql.Bit, normalized === "Active" ? 1 : 0);
  }

  if (shift) {
    if (!SHIFT_OPTIONS.includes(shift)) {
      return res.status(400).json({ success: false, message: "Invalid Shift" });
    }
    where.push("a.Shift = @Shift");
    request.input("Shift", sql.NVarChar, shift);
  }

  if (q) {
    where.push("(a.FullName LIKE @Q OR a.Email LIKE @Q OR a.EmployeeCode LIKE @Q)");
    request.input("Q", sql.NVarChar, `%${String(q)}%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const totalResult = await request.query(`
    SELECT COUNT(1) AS total
    FROM Artists a
    ${whereSql};
  `);

  const artistsResult = await request.query(`
    SELECT 
      a.ArtistId AS id,
      a.EmployeeCode,
      a.FullName,
      a.Email,
      a.DepartmentId,
      a.Shift,
      CASE WHEN a.IsActive = 1 THEN 'Active' ELSE 'Inactive' END AS status,
      a.CreatedAt,
      a.UpdatedAt
    FROM Artists a
    ${whereSql}
    ORDER BY a.CreatedAt DESC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
  `.replace("@Offset", String(offset)).replace("@PageSize", String(size)));

  const total = totalResult.recordset[0]?.total ?? 0;
  return res.json({ success: true, items: artistsResult.recordset, total, page: pageNum, pageSize: size });
}

async function getArtistById(req, res) {
  const user = req.user;
  if (!requireAllowedRole(user)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const { id } = req.params;

  return withDb(async (pool) => {
    const request = pool.request();
    request.input("ArtistId", sql.UniqueIdentifier, id);

    if (user?.role === "Department Supervisor") {
      request.input("RequesterDeptId", sql.BigInt, user.departmentId);

      const result = await request.query(`
        SELECT 
          a.ArtistId AS id,
          a.EmployeeCode,
          a.FullName,
          a.Email,
          a.DepartmentId,
          a.Shift,
          CASE WHEN a.IsActive = 1 THEN 'Active' ELSE 'Inactive' END AS status,
          a.CreatedAt,
          a.UpdatedAt
        FROM Artists a
        WHERE a.ArtistId = @ArtistId AND a.DepartmentId = @RequesterDeptId;
      `);

      if (!result.recordset[0]) {
        return res.status(404).json({ success: false, message: "Not found" });
      }
      return res.json({ success: true, artist: result.recordset[0] });
    }

    const result = await request.query(`
      SELECT 
        a.ArtistId AS id,
        a.EmployeeCode,
        a.FullName,
        a.Email,
        a.DepartmentId,
        a.Shift,
        CASE WHEN a.IsActive = 1 THEN 'Active' ELSE 'Inactive' END AS status,
        a.CreatedAt,
        a.UpdatedAt
      FROM Artists a
      WHERE a.ArtistId = @ArtistId;
    `);

    if (!result.recordset[0]) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    return res.json({ success: true, artist: result.recordset[0] });
  });
}

async function updateArtist(req, res) {
  const user = req.user;
  if (!requireAllowedRole(user)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const { id } = req.params;
  const { fullName, email, departmentId, shift } = req.body || {};

  if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
    return res.status(400).json({ success: false, message: "Full Name is required" });
  }
  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }
  if (!departmentId || typeof departmentId !== "string") {
    return res.status(400).json({ success: false, message: "Department is required" });
  }
  if (!shift || typeof shift !== "string" || !shift.trim()) {
    return res.status(400).json({ success: false, message: "Shift is required" });
  }
  if (!SHIFT_OPTIONS.includes(shift)) {
    return res.status(400).json({ success: false, message: "Invalid Shift" });
  }

  if (user?.role === "Department Supervisor" && String(departmentId) !== String(user.departmentId)) {
    return res.status(403).json({ success: false, message: "Forbidden for this department" });
  }

  return withDb(async (pool) => {
    const request = pool.request();
    request.input("ArtistId", sql.UniqueIdentifier, id);
    request.input("FullName", sql.NVarChar, fullName.trim());
    request.input("Email", sql.NVarChar, email.trim().toLowerCase());
    request.input("DepartmentId", sql.BigInt, departmentId);
    request.input("Shift", sql.NVarChar, shift);

    try {
      const result = await request.query(`
        UPDATE Artists
        SET FullName = @FullName,
            Email = @Email,
            DepartmentId = @DepartmentId,
            Shift = @Shift,
            UpdatedAt = GETDATE()
        OUTPUT inserted.ArtistId AS id, inserted.EmployeeCode, inserted.FullName, inserted.Email, inserted.DepartmentId, inserted.Shift,
               CASE WHEN inserted.IsActive = 1 THEN 'Active' ELSE 'Inactive' END AS status,
               inserted.CreatedAt, inserted.UpdatedAt
        WHERE ArtistId = @ArtistId;
      `);

      if (!result.recordset[0]) {
        return res.status(404).json({ success: false, message: "Not found" });
      }

      return res.json({ success: true, artist: result.recordset[0] });
    } catch (err) {
      return res.status(409).json({ success: false, message: "Email already exists" });
    }
  });
}

async function toggleArtistActive(req, res) {
  const user = req.user;
  if (!requireAllowedRole(user)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const { id } = req.params;

  return withDb(async (pool) => {
    const request = pool.request();
    request.input("ArtistId", sql.UniqueIdentifier, id);

    if (user?.role === "Department Supervisor") {
      request.input("RequesterDeptId", sql.BigInt, user.departmentId);

      const result = await request.query(`
        UPDATE Artists
        SET IsActive = CASE WHEN IsActive = 1 THEN 0 ELSE 1 END,
            UpdatedAt = GETDATE()
        OUTPUT inserted.ArtistId AS id,
               inserted.EmployeeCode,
               inserted.FullName,
               inserted.Email,
               inserted.DepartmentId,
               inserted.Shift,
               CASE WHEN inserted.IsActive = 1 THEN 'Active' ELSE 'Inactive' END AS status,
               inserted.CreatedAt,
               inserted.UpdatedAt
        WHERE ArtistId = @ArtistId AND DepartmentId = @RequesterDeptId;
      `);

      if (!result.recordset[0]) return res.status(404).json({ success: false, message: "Not found" });
      return res.json({ success: true, artist: result.recordset[0] });
    }

    const result = await request.query(`
      UPDATE Artists
      SET IsActive = CASE WHEN IsActive = 1 THEN 0 ELSE 1 END,
          UpdatedAt = GETDATE()
      OUTPUT inserted.ArtistId AS id,
             inserted.EmployeeCode,
             inserted.FullName,
             inserted.Email,
             inserted.DepartmentId,
             inserted.Shift,
             CASE WHEN inserted.IsActive = 1 THEN 'Active' ELSE 'Inactive' END AS status,
             inserted.CreatedAt,
             inserted.UpdatedAt
      WHERE ArtistId = @ArtistId;
    `);

    if (!result.recordset[0]) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, artist: result.recordset[0] });
  });
}

// Bind auth to all handlers
const secured = (handler) => authMiddleware(['Production Head', 'Department Supervisor'], handler);

module.exports = {
  getArtists: secured(getArtists),
  getArtistById: secured(getArtistById),
  createArtist: secured(createArtist),
  updateArtist: secured(updateArtist),
  toggleArtistActive: secured(toggleArtistActive),
};

