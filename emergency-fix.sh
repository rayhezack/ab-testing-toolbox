#!/bin/bash

echo "🚨 紧急修复脚本 - 解决样式和API问题"

# 进入项目目录
cd /var/www/ab-testing-toolbox

# 更新代码
echo "📥 更新代码..."
git pull origin main

# 检查后端服务状态
echo "🔍 检查后端服务状态..."
if systemctl is-active --quiet ab-testing-backend; then
    echo "✅ 后端服务正在运行"
else
    echo "❌ 后端服务未运行，正在启动..."
    sudo systemctl start ab-testing-backend
    sudo systemctl enable ab-testing-backend
fi

# 检查后端端口
echo "🔍 检查后端端口..."
if netstat -tlnp | grep :8000; then
    echo "✅ 后端端口8000正在监听"
else
    echo "❌ 后端端口8000未监听"
fi

# 进入前端目录
cd frontend

# 清理并重新构建
echo "🧹 清理并重新构建..."
rm -rf node_modules dist
rm -f package-lock.json pnpm-lock.yaml
npm cache clean --force

# 安装依赖
echo "📦 安装依赖..."
npm install --legacy-peer-deps --force

# 构建前端
echo "🔨 构建前端..."
npm run build

# 检查构建结果
echo "✅ 检查构建结果..."
if [ -d "dist" ]; then
    echo "✅ 构建目录存在"
    ls -la dist/
    
    if [ -d "dist/assets" ]; then
        echo "📁 检查 assets 目录..."
        ls -la dist/assets/
        
        # 检查CSS文件
        CSS_FILES=$(find dist/assets -name "*.css" 2>/dev/null)
        if [ -n "$CSS_FILES" ]; then
            echo "✅ CSS文件已生成:"
            echo "$CSS_FILES"
        else
            echo "❌ 未找到CSS文件"
        fi
    fi
else
    echo "❌ 构建失败"
    exit 1
fi

# 重启Nginx
echo "🔄 重启Nginx..."
sudo systemctl restart nginx

# 测试API连接
echo "🔍 测试API连接..."
sleep 3
if curl -f http://localhost/api/health > /dev/null 2>&1; then
    echo "✅ API连接正常"
else
    echo "❌ API连接失败"
    echo "检查后端日志:"
    sudo journalctl -u ab-testing-backend -n 20
fi

echo "✅ 紧急修复完成！"
echo "🌐 访问地址: http://$(curl -s ifconfig.me)"
echo "🔍 API健康检查: http://$(curl -s ifconfig.me)/api/health" 