const { getArtistWorkloadReport } = require('./services/reportsService');

async function test() {
  try {
    const res = await getArtistWorkloadReport();
    const data = res.items.slice(0, 10);
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
test();
