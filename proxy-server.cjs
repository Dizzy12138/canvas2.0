const http = require('http');

const PORT = 20133;
const TARGET_HOST = 'localhost';
const TARGET_PORT = 3000;

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  const options = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers
  };
  
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (err) => {
    console.error('代理请求错误:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('代理错误: ' + err.message);
  });
  
  req.pipe(proxyReq);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`代理服务器启动在端口 ${PORT}`);
  console.log(`将请求转发到 http://${TARGET_HOST}:${TARGET_PORT}`);
});
