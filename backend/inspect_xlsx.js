const AdmZip = require('adm-zip');
const fs = require('fs');

try {
    const zip = new AdmZip('test-import.xlsx');
    const zipEntries = zip.getEntries();
    
    console.log("XLSX Contents:");
    zipEntries.forEach(function (zipEntry) {
        console.log(zipEntry.entryName);
    });

    // Check for drawing files to see if there are images
    const drawingEntry = zipEntries.find(e => e.entryName.includes('xl/drawings/drawing1.xml'));
    if (drawingEntry) {
        console.log("\nDrawing XML:");
        console.log(drawingEntry.getData().toString('utf8'));
    }
} catch (err) {
    console.error(err);
}
