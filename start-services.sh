#!/bin/bash

echo "启动AI Canvas Tool服务..."

# 杀死现有进程
echo "停止现有服务..."
pkill -f "node.*server.js" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "proxy-server" 2>/dev/null

# 等待进程完全停止
sleep 2

# 启动后端服务
echo "启动后端服务 (端口 8000)..."
cd /root/canvas2.0
node backend/server.js &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 启动前端服务
echo "启动前端服务 (端口 3000)..."
npm run dev &
FRONTEND_PID=$!

# 等待前端启动
sleep 5

# 启动代理服务器
echo "启动代理服务器 (端口 20133)..."
node proxy-server.cjs &
PROXY_PID=$!

# 等待代理启动
sleep 2

echo "所有服务已启动!"
echo "后端服务 PID: $BACKEND_PID"
echo "前端服务 PID: $FRONTEND_PID"
echo "代理服务 PID: $PROXY_PID"
echo ""
echo "访问地址: http://120.221.130.27:20133"
echo "本地前端: http://localhost:3000"
echo "本地后端: http://localhost:8000"

# 保持脚本运行
wait
