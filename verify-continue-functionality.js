/**
 * Simple verification script for continue button functionality
 * Tests API endpoints and validates data flow
 */

const http = require('http');

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonBody, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function verifyWorkbookFunctionality() {
  console.log('🔍 Verifying workbook continue functionality...\n');

  try {
    // Step 1: Test authentication endpoint
    console.log('📍 Step 1: Testing authentication endpoint...');

    const authResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/workbook/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    }, {
      email: 'test@6fbmethodologies.com',
      password: 'password123'
    });

    if (authResponse.status !== 200) {
      console.log(`❌ Authentication failed: ${authResponse.status}`);
      return false;
    }

    // Extract auth cookies
    const setCookieHeaders = authResponse.headers['set-cookie'] || [];
    const cookies = setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');

    console.log('✅ Authentication successful');

    // Step 2: Test modules endpoint
    console.log('📍 Step 2: Testing modules endpoint...');

    const modulesResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/workbook/modules?includeProgress=true',
      method: 'GET',
      headers: {
        'Cookie': cookies
      }
    });

    if (modulesResponse.status !== 200) {
      console.log(`❌ Modules endpoint failed: ${modulesResponse.status}`);
      return false;
    }

    const modules = modulesResponse.data;
    console.log(`✅ Modules loaded: ${modules.length} modules found`);

    if (modules.length === 0) {
      console.log('❌ No modules available for testing');
      return false;
    }

    // Step 3: Test module details endpoint (simulating continue button click)
    console.log('📍 Step 3: Testing module details endpoint (continue button simulation)...');

    const testModule = modules[0]; // Use first module
    const moduleDetailResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: `/api/workbook/modules/${testModule.id}`,
      method: 'GET',
      headers: {
        'Cookie': cookies
      }
    });

    if (moduleDetailResponse.status !== 200) {
      console.log(`❌ Module details endpoint failed: ${moduleDetailResponse.status}`);
      return false;
    }

    const moduleDetails = moduleDetailResponse.data;
    console.log(`✅ Module details loaded: "${moduleDetails.title}"`);

    // Step 4: Validate module structure
    console.log('📍 Step 4: Validating module structure...');

    const requiredFields = ['id', 'title', 'description', 'lessons'];
    const missingFields = requiredFields.filter(field => !moduleDetails[field]);

    if (missingFields.length > 0) {
      console.log(`❌ Module missing required fields: ${missingFields.join(', ')}`);
      return false;
    }

    console.log(`✅ Module structure valid, ${moduleDetails.lessons.length} lessons found`);

    // Step 5: Validate lesson structure
    console.log('📍 Step 5: Validating lesson structure...');

    if (moduleDetails.lessons.length === 0) {
      console.log('❌ No lessons found in module');
      return false;
    }

    const testLesson = moduleDetails.lessons[0];
    const lessonRequiredFields = ['id', 'title', 'type'];
    const lessonMissingFields = lessonRequiredFields.filter(field => !testLesson[field]);

    if (lessonMissingFields.length > 0) {
      console.log(`❌ Lesson missing required fields: ${lessonMissingFields.join(', ')}`);
      return false;
    }

    console.log(`✅ Lesson structure valid: "${testLesson.title}" (${testLesson.type})`);

    // Step 6: Test lesson content types
    console.log('📍 Step 6: Testing lesson content types...');

    const lessonTypes = [...new Set(moduleDetails.lessons.map(lesson => lesson.type))];
    console.log(`✅ Lesson types available: ${lessonTypes.join(', ')}`);

    // Step 7: Validate interactive content
    console.log('📍 Step 7: Validating interactive content...');

    const interactiveLessons = moduleDetails.lessons.filter(lesson => lesson.type === 'interactive');
    if (interactiveLessons.length > 0) {
      console.log(`✅ Found ${interactiveLessons.length} interactive lessons`);

      const interactiveLesson = interactiveLessons[0];
      if (interactiveLesson.content && interactiveLesson.content.component) {
        console.log(`✅ Interactive component configured: ${interactiveLesson.content.component}`);
      } else {
        console.log('⚠️ Interactive lesson found but no component specified');
      }
    } else {
      console.log('⚠️ No interactive lessons found');
    }

    // Step 8: Summary
    console.log('\n📊 VERIFICATION SUMMARY:');
    console.log('✅ Authentication: Working');
    console.log('✅ Modules API: Working');
    console.log('✅ Module Details API: Working');
    console.log('✅ Data Structure: Valid');
    console.log('✅ Lesson Content: Available');

    console.log('\n🎉 CONTINUE BUTTON FUNCTIONALITY VERIFIED!');
    console.log('The backend APIs are working correctly and will support the continue button functionality.');

    return true;

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

// Run verification
verifyWorkbookFunctionality()
  .then(success => {
    console.log(`\n🏁 Verification ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Verification crashed:', error);
    process.exit(1);
  });