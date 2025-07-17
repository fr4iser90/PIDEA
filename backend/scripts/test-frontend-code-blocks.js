const http = require('http');

async function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testFrontendCodeBlocks() {
  console.log('🧪 Testing frontend code block display...');
  
  try {
    // First, get a token
    console.log('🔐 Getting authentication token...');
    const loginResponse = await makeRequest('POST', '/api/auth/login', {
      email: 'test@test.com',
      password: 'test123'
    });
    
    if (!loginResponse.success) {
      throw new Error('Login failed: ' + loginResponse.error);
    }
    
    const token = loginResponse.data.accessToken;
    console.log('✅ Got authentication token');
    
    // Send a test message
    const testMessage = {
      message: "Here's a simple JavaScript function:",
      requestedBy: "test@test.com"
    };
    
    console.log('📤 Sending test message...');
    const chatResponse = await makeRequest('POST', '/api/chat', testMessage, token);
    
    console.log('✅ Chat response received');
    console.log('📊 Response data:', JSON.stringify(chatResponse, null, 2));
    
    if (chatResponse.data && chatResponse.data.codeBlocks) {
      console.log(`🎉 Found ${chatResponse.data.codeBlocks.length} code blocks!`);
      chatResponse.data.codeBlocks.forEach((block, index) => {
        console.log(`\n📝 Code Block ${index + 1}:`);
        console.log(`   Language: ${block.language}`);
        console.log(`   Content: ${block.content.substring(0, 100)}...`);
        console.log(`   Confidence: ${block.confidence}`);
      });
    } else {
      console.log('❌ No code blocks found in response');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFrontendCodeBlocks().catch(console.error); 