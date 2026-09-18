const { getArtistWorkloadReport } = require('./services/reportsService');

async function run() {
  try {
    const res = await getArtistWorkloadReport();
    console.log("Success! Items:", res.items.length);
    console.log("First item:", res.items[0]);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
