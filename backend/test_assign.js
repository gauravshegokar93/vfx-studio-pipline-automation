async function test() {
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeCode: 'EMP-001', password: 'password123' })
    });
    const login = await loginRes.json();
    const res = await fetch('http://localhost:5000/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${login.token}` },
      body: JSON.stringify({ taskId: 215, userId: 3, targetBid: 2.0 })
    });
    const data = await res.json();
    console.log(res.status, data);
  } catch (e) {
    console.error(e);
  }
}
test();
