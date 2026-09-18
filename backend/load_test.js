const http = require('http');
const https = require('https');

// Config
const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}/api`;
const CONCURRENCY_LEVELS = [50, 100, 150, 200, 250];
const TEST_DURATION_MS = 10000; // 10 seconds per level

const agent = new http.Agent({ keepAlive: true, maxSockets: 1000 });

require('dotenv').config({ path: __dirname + '/.env' });
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

const token = jwt.sign({
  userId: 1004,
  roleId: 2,
  roleName: 'Admin',
  departmentId: 12,
  departmentName: 'CG',
}, JWT_SECRET, { expiresIn: '2h' });

function makeRequest(path) {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    const req = http.request(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      agent
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        const end = process.hrtime.bigint();
        const latencyMs = Number(end - start) / 1000000.0;
        resolve({
          status: res.statusCode,
          latency: latencyMs
        });
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 'TIMEOUT', latency: 0 });
    });
    
    req.setTimeout(10000); // 10s timeout
    req.on('error', (err) => {
      resolve({ status: 'ERROR', latency: 0, error: err.message });
    });
    req.end();
  });
}

async function runTest(concurrency, path) {
  console.log(`\nStarting test for ${path} with concurrency ${concurrency}`);
  
  let totalRequests = 0;
  let successfulRequests = 0;
  let error5xx = 0;
  let error4xx = 0;
  let timeouts = 0;
  let latencies = [];
  
  const startTime = Date.now();
  let running = true;
  
  setTimeout(() => { running = false; }, TEST_DURATION_MS);
  
  const worker = async () => {
    while (running) {
      totalRequests++;
      const res = await makeRequest(path);
      
      if (res.status === 'TIMEOUT') timeouts++;
      else if (res.status === 'ERROR') error5xx++; // network error
      else if (res.status >= 500) error5xx++;
      else if (res.status >= 400) error4xx++;
      else successfulRequests++;
      
      if (res.latency > 0) latencies.push(res.latency);
    }
  };
  
  const promises = [];
  for (let i = 0; i < concurrency; i++) {
    promises.push(worker());
  }
  
  await Promise.all(promises);
  
  const actualDurationMs = Date.now() - startTime;
  const rps = (totalRequests / (actualDurationMs / 1000)).toFixed(2);
  
  latencies.sort((a, b) => a - b);
  const avg = latencies.length ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2) : 0;
  const p95 = latencies.length ? latencies[Math.floor(latencies.length * 0.95)].toFixed(2) : 0;
  
  console.log(`Duration: ${(actualDurationMs/1000).toFixed(2)}s`);
  console.log(`Total Requests: ${totalRequests} (${rps} req/sec)`);
  console.log(`Success (2xx): ${successfulRequests}`);
  console.log(`Errors (4xx): ${error4xx}`);
  console.log(`Errors (5xx): ${error5xx}`);
  console.log(`Timeouts: ${timeouts}`);
  console.log(`Latency: Avg ${avg}ms | P95 ${p95}ms`);
}

async function main() {
  console.log('Starting load tests with hardcoded JWT');
  
  const endpoints = [
    '/notifications',
    '/reports/dashboard',
    '/reports/artist-workload',
    '/tasks'
  ];
  
  for (let concurrency of CONCURRENCY_LEVELS) {
    console.log(`\n=================================================`);
    console.log(` CONCURRENCY LEVEL: ${concurrency} USERS`);
    console.log(`=================================================`);
    
    for (let ep of endpoints) {
      await runTest(concurrency, ep);
    }
  }
}

main();
