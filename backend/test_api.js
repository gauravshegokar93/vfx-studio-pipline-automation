const http = require('http');

const postData = JSON.stringify({
  email: 'admin@smfx.vfx',
  password: 'harish'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Login Response:', data);
    const token = JSON.parse(data).accessToken;
    if (token) {
      console.log('Got token, fetching /api/users...');
      const req2 = http.request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/users',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token
        }
      }, (res2) => {
        let data2 = '';
        res2.on('data', (chunk) => { data2 += chunk; });
        res2.on('end', () => {
          console.log('GET /api/users Status:', res2.statusCode);
          console.log('GET /api/users Response:', data2);
        });
      });
      req2.end();
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();
