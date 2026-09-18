const http = require('http');
require('dotenv').config({ path: __dirname + '/.env' });
const jwt = require('jsonwebtoken');

const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}/api`;
const CONCURRENCY_LEVELS = [50, 100, 150, 200, 250];
const TEST_DURATION_MS = 15000; // 15 seconds per concurrency level
const THINK_TIME_MS = 1000;

const agent = new http.Agent({ keepAlive: true, maxSockets: 1000 });
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const token = jwt.sign({
  userId: 1004,
  roleId: 2,
  roleName: 'Admin',
  departmentId: 12,
  departmentName: 'CG',
}, JWT_SECRET, { expiresIn: '2h' });

const sleep = ms => new Promise(r => setTimeout(r, ms));

function makeRequest(path) {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    const req = http.request(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
      agent
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        const end = process.hrtime.bigint();
        resolve({ path, status: res.statusCode, latency: Number(end - start) / 1000000.0 });
      });
    });
    req.on('timeout', () => { req.destroy(); resolve({ path, status: 'TIMEOUT', latency: 0 }); });
    req.setTimeout(15000); 
    req.on('error', (err) => resolve({ path, status: 'ERROR', latency: 0 }));
    req.end();
  });
}

function getEndpointForUser(userIdx, totalConcurrency) {
  const pct = userIdx / totalConcurrency;
  if (pct < 0.30) return '/tasks';
  if (pct < 0.50) return '/notifications';
  if (pct < 0.65) return '/reports/dashboard';
  if (pct < 0.80) return '/reports/artist-workload';
  if (pct < 0.85) return '/reports/analytics';
  return '/projects'; // "Other safe GET APIs"
}

async function runTest(concurrency) {
  console.log(`\n=================================================`);
  console.log(` MIXED SCENARIO | CONCURRENCY: ${concurrency}`);
  console.log(`=================================================`);
  
  let stats = {
    '/tasks': { reqs: 0, latencies: [] },
    '/notifications': { reqs: 0, latencies: [] },
    '/reports/dashboard': { reqs: 0, latencies: [] },
    '/reports/artist-workload': { reqs: 0, latencies: [] },
    '/reports/analytics': { reqs: 0, latencies: [] },
    '/projects': { reqs: 0, latencies: [] },
  };
  
  let errs = 0, timeouts = 0, totalReqs = 0;
  
  const startTime = Date.now();
  let running = true;
  setTimeout(() => { running = false; }, TEST_DURATION_MS);
  
  const worker = async (userIdx) => {
    const ep = getEndpointForUser(userIdx, concurrency);
    while (running) {
      const res = await makeRequest(ep);
      totalReqs++;
      
      if (res.status === 'TIMEOUT') timeouts++;
      else if (res.status === 'ERROR' || res.status >= 400) errs++;
      else {
        stats[ep].reqs++;
        if (res.latency > 0) stats[ep].latencies.push(res.latency);
      }
      
      if (running) await sleep(THINK_TIME_MS * 0.5 + Math.random() * THINK_TIME_MS);
    }
  };
  
  const promises = [];
  for (let i = 0; i < concurrency; i++) promises.push(worker(i));
  await Promise.all(promises);
  
  const actualDurationMs = Date.now() - startTime;
  
  console.log(`Duration: ${(actualDurationMs/1000).toFixed(2)}s | Total Reqs: ${totalReqs} | Errs: ${errs} | Timeouts: ${timeouts}`);
  
  Object.keys(stats).forEach(ep => {
    const lat = stats[ep].latencies.sort((a,b) => a-b);
    if (!lat.length) return;
    const avg = (lat.reduce((a,b)=>a+b,0)/lat.length).toFixed(2);
    const p50 = lat[Math.floor(lat.length * 0.50)].toFixed(2);
    const p95 = lat[Math.floor(lat.length * 0.95)].toFixed(2);
    console.log(`[${ep}] Reqs: ${stats[ep].reqs} | Avg: ${avg}ms | P50: ${p50}ms | P95: ${p95}ms`);
  });
}

async function main() {
  for (let c of CONCURRENCY_LEVELS) {
    await runTest(c);
  }
}

main();
