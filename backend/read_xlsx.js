const xlsx = require('xlsx');

try {
    const workbook = xlsx.readFile('test-import.xlsx');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log("Headers:");
    if (data.length > 0) {
        console.log(data[0]);
    }
    console.log("\nFirst row of data:");
    if (data.length > 1) {
        console.log(data[1]);
    }
} catch (err) {
    console.error(err);
}
