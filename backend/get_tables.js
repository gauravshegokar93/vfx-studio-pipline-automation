const fs = require('fs');
const data = JSON.parse(fs.readFileSync('tables_schema.json', 'utf-8'));
console.log(Object.keys(data).join('\n'));
