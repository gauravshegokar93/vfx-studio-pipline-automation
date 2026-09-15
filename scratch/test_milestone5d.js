const app = require('../backend/server');
const { getDashboardData, getDepartmentProgressReport, getArtistWorkloadReport, getOverdueTasksReport } = require('../backend/services/reportsService');

async function testBackend() {
  console.log('--- Testing Milestone 5D Reports Queries ---');
  try {
    const dash = await getDashboardData();
    console.log('[Dashboard] Success:', dash.success);
    console.log('[Dashboard] Active Projects:', dash.kpi.activeProjects);
    console.log('[Dashboard] Total Shots:', dash.kpi.totalShots);
    console.log('[Dashboard] Estimated Bid:', dash.kpi.totalEstimatedBid, 'Bid');
    console.log('[Dashboard] Actual Bid:', dash.kpi.totalActualBid, 'Bid');

    const deptProg = await getDepartmentProgressReport();
    console.log('\n[Department Progress] Items count:', deptProg.items.length);
    deptProg.items.forEach(d => {
      console.log(` - ${d.department}: Total Tasks ${d.totalTasks}, Done ${d.completed}, Tgt ${d.targetBid} Bid, Act ${d.actualBid} Bid`);
    });

    const artistWorkload = await getArtistWorkloadReport();
    console.log('\n[Artist Workload] Artists count:', artistWorkload.items.length);
    artistWorkload.items.slice(0, 3).forEach(w => {
      console.log(` - ${w.artist.fullName} (${w.artist.employeeCode}): Tasks ${w.taskCount}, Overdue ${w.overdueCount}, Tgt ${w.targetBid} Bid`);
    });

    const overdue = await getOverdueTasksReport();
    console.log('\n[Overdue Tasks] Count:', overdue.count);

    console.log('\nAll Milestone 5D Backend Verification Passed!');
    process.exit(0);
  } catch (err) {
    console.error('Backend Verification Error:', err);
    process.exit(1);
  }
}

testBackend();
