#!/usr/bin/env node

const http = require('http');

// 测试后端服务
console.log('测试后端服务...');
const backendReq = http.request('http://localhost:8000/api/apps', (res) => {
  console.log(`后端状态: ${res.statusCode}`);
  if (res.statusCode === 200) {
    console.log('✅ 后端服务正常');
  } else {
    console.log('❌ 后端服务异常');
  }
});

backendReq.on('error', (err) => {
  console.log('❌ 后端服务连接失败:', err.message);
});

backendReq.end();

// 测试前端服务
setTimeout(() => {
  console.log('\n测试前端服务...');
  const frontendReq = http.request('http://localhost:3002', (res) => {
    console.log(`前端状态: ${res.statusCode}`);
    if (res.statusCode === 200) {
      console.log('✅ 前端服务正常');
    } else {
      console.log('❌ 前端服务异常');
    }
  });

  frontendReq.on('error', (err) => {
    console.log('❌ 前端服务连接失败:', err.message);
  });

  frontendReq.end();
}, 1000);

// 测试代理服务
setTimeout(() => {
  console.log('\n测试代理服务...');
  const proxyReq = http.request('http://localhost:20133', (res) => {
    console.log(`代理状态: ${res.statusCode}`);
    if (res.statusCode === 200) {
      console.log('✅ 代理服务正常');
    } else {
      console.log('❌ 代理服务异常');
    }
  });

  proxyReq.on('error', (err) => {
    console.log('❌ 代理服务连接失败:', err.message);
  });

  proxyReq.end();
}, 2000);
