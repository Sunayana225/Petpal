const http = require('http');

const testEndpoints = [
  { path: '/api/health', method: 'GET' },
  { path: '/api/info', method: 'GET' },
  { path: '/api/monitoring/status', method: 'GET' },
  { path: '/api/monitoring/metrics', method: 'GET' },
  { path: '/api/food-safety/pets', method: 'GET' }
];

function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: endpoint.path,
      method: endpoint.method
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          endpoint: endpoint.path,
          status: res.statusCode,
          success: res.statusCode >= 200 && res.statusCode < 300,
          data: data.length > 100 ? data.substring(0, 100) + '...' : data
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        endpoint: endpoint.path,
        status: 'ERROR',
        success: false,
        error: err.message
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing PetPal API Endpoints...\n');
  
  for (const endpoint of testEndpoints) {
    const result = await testEndpoint(endpoint);
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${endpoint.method} ${result.endpoint}`);
    console.log(`   Status: ${result.status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    } else if (result.data) {
      console.log(`   Response: ${result.data}`);
    }
    console.log('');
  }
}

runTests().catch(console.error);
