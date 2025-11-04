#!/bin/bash

echo "=== 彻底清理所有进程 ==="
# 强制杀死所有相关进程
pkill -9 -f "node.*server.js" 2>/dev/null || true
pkill -9 -f "proxy-server" 2>/dev/null || true
pkill -9 -f "vite" 2>/dev/null || true

# 强制释放端口
fuser -k 8000/tcp 2>/dev/null || true
fuser -k 20133/tcp 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 3001/tcp 2>/dev/null || true
fuser -k 3002/tcp 2>/dev/null || true
fuser -k 3003/tcp 2>/dev/null || true
fuser -k 3004/tcp 2>/dev/null || true

echo "等待3秒让端口完全释放..."
sleep 3

echo "=== 启动后端服务 (端口 8000) ==="
cd /root/canvas2.0
node backend/server.js > backend.log 2>&1 &
BACKEND_PID=$!
echo "后端服务启动，PID: $BACKEND_PID"

echo "等待3秒让后端完全启动..."
sleep 3

echo "=== 启动前端服务 ==="
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "前端服务启动，PID: $FRONTEND_PID"

echo "等待5秒让前端完全启动..."
sleep 5

# 从日志中提取前端端口
FRONTEND_PORT=$(grep -o "http://localhost:[0-9]\+" frontend.log | tail -1 | grep -o "[0-9]\+")
if [ -z "$FRONTEND_PORT" ]; then
    FRONTEND_PORT=3000
fi
echo "检测到前端端口: $FRONTEND_PORT"

echo "=== 更新代理配置 ==="
sed -i "s/const TARGET_PORT = [0-9]\+;/const TARGET_PORT = $FRONTEND_PORT;/" proxy-server.cjs

echo "=== 启动代理服务 (端口 20133) ==="
node proxy-server.cjs > proxy.log 2>&1 &
PROXY_PID=$!
echo "代理服务启动，PID: $PROXY_PID"

echo "=== 服务启动完成 ==="
echo "后端: http://localhost:8000 (PID: $BACKEND_PID)"
echo "前端: http://localhost:$FRONTEND_PORT (PID: $FRONTEND_PID)"
echo "代理: http://120.221.130.27:20133 (PID: $PROXY_PID)"
echo ""
echo "访问地址: http://120.221.130.27:20133"
echo ""
echo "=== 测试后端连接 ==="
sleep 2
curl -s http://localhost:8000/api/apps/6901b137091416feb6768e12 | head -c 100
echo ""
echo "=== 完成 ==="
