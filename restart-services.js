const http = require('http');
const { exec } = require('child_process');

console.log('=== 彻底清理所有进程 ===');

// 强制杀死所有相关进程
exec('pkill -9 -f "node.*server.js" || true', (err) => {
  if (err) console.log('清理后端进程:', err.message);
});

exec('pkill -9 -f "proxy-server" || true', (err) => {
  if (err) console.log('清理代理进程:', err.message);
});

exec('pkill -9 -f "vite" || true', (err) => {
  if (err) console.log('清理前端进程:', err.message);
});

// 强制释放端口
exec('fuser -k 8000/tcp || true', (err) => {
  if (err) console.log('释放8000端口:', err.message);
});

exec('fuser -k 20133/tcp || true', (err) => {
  if (err) console.log('释放20133端口:', err.message);
});

exec('fuser -k 3000/tcp || true', (err) => {
  if (err) console.log('释放3000端口:', err.message);
});

exec('fuser -k 3001/tcp || true', (err) => {
  if (err) console.log('释放3001端口:', err.message);
});

exec('fuser -k 3002/tcp || true', (err) => {
  if (err) console.log('释放3002端口:', err.message);
});

exec('fuser -k 3003/tcp || true', (err) => {
  if (err) console.log('释放3003端口:', err.message);
});

exec('fuser -k 3004/tcp || true', (err) => {
  if (err) console.log('释放3004端口:', err.message);
});

setTimeout(() => {
  console.log('等待3秒让端口完全释放...');
  
  setTimeout(() => {
    console.log('=== 启动后端服务 (端口 8000) ===');
    exec('cd /root/canvas2.0 && node backend/server.js > backend.log 2>&1 &', (err) => {
      if (err) {
        console.log('后端启动失败:', err.message);
      } else {
        console.log('后端服务启动成功');
      }
    });
    
    setTimeout(() => {
      console.log('等待3秒让后端完全启动...');
      
      setTimeout(() => {
        console.log('=== 启动前端服务 ===');
        exec('cd /root/canvas2.0 && npm run dev > frontend.log 2>&1 &', (err) => {
          if (err) {
            console.log('前端启动失败:', err.message);
          } else {
            console.log('前端服务启动成功');
          }
        });
        
        setTimeout(() => {
          console.log('等待5秒让前端完全启动...');
          
          setTimeout(() => {
            // 从日志中提取前端端口
            exec('cd /root/canvas2.0 && grep -o "http://localhost:[0-9]\\+" frontend.log | tail -1 | grep -o "[0-9]\\+"', (err, stdout) => {
              let frontendPort = stdout.trim();
              if (!frontendPort) {
                frontendPort = '3000';
              }
              console.log('检测到前端端口:', frontendPort);
              
              console.log('=== 更新代理配置 ===');
              exec(`cd /root/canvas2.0 && sed -i "s/const TARGET_PORT = [0-9]\\+;/const TARGET_PORT = ${frontendPort};/" proxy-server.cjs`, (err) => {
                if (err) {
                  console.log('更新代理配置失败:', err.message);
                } else {
                  console.log('代理配置更新成功');
                }
              });
              
              setTimeout(() => {
                console.log('=== 启动代理服务 (端口 20133) ===');
                exec('cd /root/canvas2.0 && node proxy-server.cjs > proxy.log 2>&1 &', (err) => {
                  if (err) {
                    console.log('代理启动失败:', err.message);
                  } else {
                    console.log('代理服务启动成功');
                  }
                });
                
                setTimeout(() => {
                  console.log('=== 服务启动完成 ===');
                  console.log('后端: http://localhost:8000');
                  console.log('前端: http://localhost:' + frontendPort);
                  console.log('代理: http://120.221.130.27:20133');
                  console.log('');
                  console.log('访问地址: http://120.221.130.27:20133');
                  console.log('');
                  
                  console.log('=== 测试后端连接 ===');
                  setTimeout(() => {
                    const req = http.get('http://localhost:8000/api/apps/6901b137091416feb6768e12', (res) => {
                      let data = '';
                      res.on('data', (chunk) => {
                        data += chunk;
                      });
                      res.on('end', () => {
                        console.log('后端测试响应:', data.substring(0, 200));
                        console.log('=== 完成 ===');
                      });
                    });
                    
                    req.on('error', (err) => {
                      console.log('后端测试失败:', err.message);
                      console.log('=== 完成 ===');
                    });
                  }, 2000);
                }, 2000);
              }, 1000);
            });
          }, 5000);
        }, 1000);
      }, 3000);
    }, 1000);
  }, 3000);
}, 1000);
