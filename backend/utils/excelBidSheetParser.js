const XLSX = require('xlsx');

function parseDateValue(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;

  const s = String(v).trim();
  if (!s) return null;

  // Try ISO / readable date
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;

  // Try Excel serial date
  const num = Number(s);
  if (Number.isFinite(num)) {
    // Excel serial date to JS date (1900 date system)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const ms = num * 24 * 60 * 60 * 1000;
    return new Date(excelEpoch.getTime() + ms);
  }

  return null;
}

function toNumberOrNull(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return n;
}

function mapRow(raw, rowNumber) {
  const sequenceCode = raw['EP/Reel*'] ?? raw['EP/Reel'] ?? raw['EP/Reel *'];
  const shotCode = raw['Shot Name*'] ?? raw['Shot Name'] ?? raw['Shot Name *'];

  return {
    rowNumber,

    // Excel mapping (from task)
    clientShotName:
      raw['Client Shot Name'] ??
      raw['Client Shot Name '] ??
      raw['Client Shot Name*'] ??
      raw['Client Shot Name* '],

    sequenceCode,
    shotCode,
    type: raw['Type'] ?? raw['Type '] ?? raw['Type*'] ?? raw['ShotType'],
    frameRange: raw['Frame Range'] ?? raw['Frame Range '] ?? null,
    cutSummary: raw['Cut Summary'] ?? raw['Cut Summary '] ?? null,
    description:
      raw['VFX Work Description'] ??
      raw['VFX Work Description '] ??
      raw['VFX Work Description*'] ??
      null,

    priority: raw['Complexity*'] ?? raw['Complexity'] ?? null,

    rotoBid: toNumberOrNull(raw['Roto Bid*'] ?? raw['Roto Bid'] ?? null),
    paintBid: toNumberOrNull(raw['Paint Bid*'] ?? raw['Paint Bid'] ?? null),
    compBid: toNumberOrNull(raw['Comp*'] ?? raw['Comp'] ?? raw['Comp Bid'] ?? null),
    cgBid: toNumberOrNull(raw['CG*'] ?? raw['CG'] ?? null),

    leadEmployeeCodeOrName: raw['Lead'] ?? raw['Lead '] ?? raw['Lead*'] ?? null,
    artistEmployeeCodeOrName:
      raw['Artist'] ?? raw['Artist '] ?? raw['Artist*'] ?? null,

    dueDate: parseDateValue(raw['ETA'] ?? raw['ETA '] ?? null),
    shotStatus: raw['Status'] ?? raw['Status '] ?? null,
    deliveryDate: parseDateValue(raw['Delivery Date'] ?? raw['Delivery Date '] ?? null),

    // keep original
    raw,
  };
}

async function parseBidSheet(fileBuffer, originalName) {
  const errors = [];
  const meta = { fileName: originalName, sheetName: null };

  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames?.[0];

  if (!firstSheetName) {
    return {
      meta,
      rows: [],
      errors: [{ message: 'No sheets found in workbook' }],
    };
  }

  meta.sheetName = firstSheetName;

  const worksheet = workbook.Sheets[firstSheetName];
  const json = XLSX.utils.sheet_to_json(worksheet, { defval: null });

  // assumes headers are in first row and first data row is at json[0]
  const rows = json.map((r, i) => mapRow(r, i + 2)); // +2 to match Excel row numbers roughly

  // Basic header presence validation
  const sample = rows[0]?.raw || {};
  const hasShot = Object.keys(sample).some((k) => /Shot Name/i.test(k));
  const hasSeq = Object.keys(sample).some((k) => /EP\/Reel/i.test(k));

  if (!hasShot || !hasSeq) {
    errors.push({
      message:
        'Invalid NTM Bid Sheet columns. Expected columns including "Shot Name" and "EP/Reel".',
    });
  }

  return { meta, rows, errors };
}

module.exports = {
  parseBidSheet,
};

