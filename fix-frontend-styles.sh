#!/bin/bash

echo "🔧 修复前端样式问题..."

# 进入项目目录
cd /var/www/ab-testing-toolbox

# 更新代码
echo "📥 更新代码..."
git pull origin main

# 进入前端目录
cd frontend

# 安装新的依赖
echo "📦 安装新的依赖..."
npm install

# 清理之前的构建
echo "🧹 清理之前的构建..."
rm -rf dist

# 重新构建前端
echo "🔨 重新构建前端..."
npm run build

# 验证构建结果
echo "✅ 验证构建结果..."
if [ ! -d "dist" ]; then
    echo "❌ 前端构建失败！"
    exit 1
fi

# 检查CSS文件
CSS_FILES=$(find dist/assets -name "*.css" 2>/dev/null)
if [ -z "$CSS_FILES" ]; then
    echo "❌ CSS文件未生成！"
    exit 1
fi

echo "✅ CSS文件已生成:"
echo "$CSS_FILES"

# 重启Nginx
echo "🔄 重启Nginx..."
sudo systemctl restart nginx

echo "✅ 前端样式修复完成！"
echo "🌐 请访问: http://$(curl -s ifconfig.me)"
echo "📁 构建目录: /var/www/ab-testing-toolbox/frontend/dist" 