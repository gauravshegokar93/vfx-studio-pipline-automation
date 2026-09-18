const http = require('http');
require('dotenv').config({ path: __dirname + '/.env' });
const jwt = require('jsonwebtoken');

const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}/api`;
const CONCURRENCY_LEVELS = [50, 100, 150, 200, 250];
const TEST_DURATION_MS = 10000; 
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
        const latencyMs = Number(end - start) / 1000000.0;
        resolve({ status: res.statusCode, latency: latencyMs });
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 'TIMEOUT', latency: 0 });
    });
    
    req.setTimeout(15000); 
    req.on('error', (err) => resolve({ status: 'ERROR', latency: 0, error: err.message }));
    req.end();
  });
}

async function runTest(concurrency, path) {
  console.log(`\n[Isolated Test] ${path} | Concurrency: ${concurrency}`);
  
  let totalReqs = 0, success = 0, err5xx = 0, err4xx = 0, timeouts = 0;
  let latencies = [];
  
  const startTime = Date.now();
  let running = true;
  setTimeout(() => { running = false; }, TEST_DURATION_MS);
  
  const worker = async () => {
    while (running) {
      const res = await makeRequest(path);
      totalReqs++;
      
      if (res.status === 'TIMEOUT') timeouts++;
      else if (res.status === 'ERROR' || res.status >= 500) err5xx++;
      else if (res.status >= 400) err4xx++;
      else success++;
      
      if (res.latency > 0) latencies.push(res.latency);
      
      // Simulate think time (randomized between 0.5s and 1.5s)
      if (running) {
        const jitter = THINK_TIME_MS * 0.5 + Math.random() * THINK_TIME_MS;
        await sleep(jitter);
      }
    }
  };
  
  const promises = [];
  for (let i = 0; i < concurrency; i++) promises.push(worker());
  await Promise.all(promises);
  
  const actualDurationMs = Date.now() - startTime;
  const rps = (totalReqs / (actualDurationMs / 1000)).toFixed(2);
  
  latencies.sort((a, b) => a - b);
  const min = latencies.length ? latencies[0].toFixed(2) : 0;
  const max = latencies.length ? latencies[latencies.length - 1].toFixed(2) : 0;
  const avg = latencies.length ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2) : 0;
  const p50 = latencies.length ? latencies[Math.floor(latencies.length * 0.50)].toFixed(2) : 0;
  const p95 = latencies.length ? latencies[Math.floor(latencies.length * 0.95)].toFixed(2) : 0;
  const p99 = latencies.length ? latencies[Math.floor(latencies.length * 0.99)].toFixed(2) : 0;
  
  console.log(`Duration: ${(actualDurationMs/1000).toFixed(2)}s | Total Reqs: ${totalReqs} (${rps} req/sec)`);
  console.log(`Success: ${success} | 4xx: ${err4xx} | 5xx: ${err5xx} | Timeouts: ${timeouts}`);
  console.log(`Latency: Min ${min} | Avg ${avg} | P50 ${p50} | P95 ${p95} | P99 ${p99} | Max ${max} (ms)`);
}

async function main() {
  const endpoints = [
    '/tasks',
    '/reports/dashboard',
    '/reports/artist-workload',
    '/reports/analytics',
    '/notifications'
  ];
  
  for (let ep of endpoints) {
    console.log(`\n=================================================`);
    console.log(` TESTING ISOLATED ENDPOINT: ${ep}`);
    console.log(`=================================================`);
    for (let c of CONCURRENCY_LEVELS) {
      await runTest(c, ep);
    }
  }
}

main();
