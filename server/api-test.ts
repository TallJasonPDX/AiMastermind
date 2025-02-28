/**
 * API Test Utility
 * 
 * This script helps verify the API proxy configuration in different environments.
 * It simulates both production and development environments to ensure proper routing.
 */

import axios from 'axios';

async function testApiConfiguration() {
  console.log('=========================================');
  console.log('API Configuration Test');
  console.log('=========================================');
  
  // Test 1: Direct connection to FastAPI
  try {
    console.log('\nTest 1: Direct FastAPI Connection');
    console.log('Attempting to connect to FastAPI directly at http://localhost:8000');
    
    const directResponse = await axios.get('http://localhost:8000/configurations/active');
    console.log('✅ Success! Direct FastAPI connection works:');
    console.log(`Status: ${directResponse.status}`);
    console.log(`Config ID: ${directResponse.data.id}`);
    console.log(`Page Title: ${directResponse.data.page_title}`);
  } catch (error: any) {
    console.error('❌ Error connecting directly to FastAPI:');
    console.error(error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n🔴 CRITICAL: FastAPI Server is not running!');
      console.error('You need to start the FastAPI server with:');
      console.error('   python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000');
      console.error('\nIf you\'re in production, you need to ensure both servers start.');
    }
  }
  
  // Test 2: Express API Proxy
  try {
    console.log('\nTest 2: Express API Proxy');
    console.log('Attempting to connect through Express proxy at http://localhost:5000/api');
    
    const proxyResponse = await axios.get('http://localhost:5000/api/configurations/active');
    console.log('✅ Success! Express proxy connection works:');
    console.log(`Status: ${proxyResponse.status}`);
    console.log(`Config ID: ${proxyResponse.data.id}`);
    console.log(`Page Title: ${proxyResponse.data.page_title}`);
  } catch (error: any) {
    console.error('❌ Error connecting through Express proxy:');
    console.error(error.message);
    
    if (error.response && error.response.data) {
      console.error('Response data:', error.response.data);
    }
  }
  
  // Test 3: Check if FastAPI docs endpoint is available
  try {
    console.log('\nTest 3: FastAPI Documentation Endpoint');
    console.log('Checking if FastAPI docs are available at http://localhost:8000/docs');
    
    const docsResponse = await axios.get('http://localhost:8000/docs', { timeout: 2000 });
    console.log('✅ Success! FastAPI docs endpoint is reachable:');
    console.log(`Status: ${docsResponse.status}`);
    console.log('You should be able to access the API docs at your deployed URL + /api/docs');
  } catch (error: any) {
    console.error('❌ Error connecting to FastAPI docs:');
    console.error(error.message);
  }

  // Test 3: Production configuration
  console.log('\nTest 3: Production Environment Configuration');
  console.log('In production, the frontend uses: /api');
  console.log('The server proxies to FastAPI at: ' + 
    (process.env.FASTAPI_URL || 'http://localhost:8000'));
  
  console.log('\n=========================================');
  console.log('Deployment Recommendations:');
  console.log('=========================================');
  console.log('1. Make sure both Express and FastAPI are running in your deployment');
  console.log('2. For single-container deployments:');
  console.log('   - Keep FASTAPI_URL as http://localhost:8000');
  console.log('   - Express will automatically proxy to the local FastAPI instance');
  console.log('3. For multi-container deployments:');
  console.log('   - Set FASTAPI_URL to your FastAPI service URL');
  console.log('   - Example: https://your-fastapi-service.replit.app');
}

// Run the test
testApiConfiguration().catch(console.error);