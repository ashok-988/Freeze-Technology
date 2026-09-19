const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api${path}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString),
      },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(dataString);
    req.end();
  });
}

async function test() {
  const payload1 = {
    fullName: "Asher Samuel",
    designation: "Director",
    department: "Management & Admin",
    phone: "7200072000",
    email: "sam@ashtech.com",
    employmentType: "Full-Time",
    monthlySalary: "160000",
    joiningDate: "25-08-2026",
    address: "Thoraipakkam, OMR, Chennai"
  };

  console.log('Testing raw frontend payload:');
  const res1 = await post('/employees', payload1);
  console.log('Response Status:', res1.status);
  console.log('Response Data:', JSON.stringify(res1.data, null, 2));
}

test();
