#!/bin/bash

echo "🔧 服务器端样式修复脚本..."

# 进入项目目录
cd /var/www/ab-testing-toolbox

# 更新代码
echo "📥 更新代码..."
git pull origin main

# 进入前端目录
cd frontend

# 清理所有依赖和缓存
echo "🧹 彻底清理..."
rm -rf node_modules
rm -rf dist
rm -f package-lock.json
rm -f pnpm-lock.yaml
npm cache clean --force

# 检查 Node.js 版本
echo "🔍 检查 Node.js 版本..."
NODE_VERSION=$(node --version)
echo "当前 Node.js 版本: $NODE_VERSION"

# 检查 npm 版本
echo "🔍 检查 npm 版本..."
NPM_VERSION=$(npm --version)
echo "当前 npm 版本: $NPM_VERSION"

# 安装依赖（强制解决冲突）
echo "📦 安装依赖..."
npm install --legacy-peer-deps --force

# 验证关键依赖
echo "🔍 验证关键依赖..."
if [ ! -d "node_modules/vite" ]; then
    echo "❌ Vite 未安装，重新安装..."
    npm install vite --legacy-peer-deps --force
fi

if [ ! -d "node_modules/tailwindcss" ]; then
    echo "❌ Tailwind CSS 未安装，重新安装..."
    npm install tailwindcss --legacy-peer-deps --force
fi

# 尝试构建
echo "🔨 开始构建..."
if npm run build; then
    echo "✅ 构建成功！"
else
    echo "❌ 构建失败，尝试备用方案..."
    
    # 备用方案：使用 npx 直接运行
    echo "🔄 使用 npx 直接构建..."
    npx vite build
    
    if [ $? -eq 0 ]; then
        echo "✅ 备用构建成功！"
    else
        echo "❌ 所有构建方案都失败了"
        exit 1
    fi
fi

# 验证构建结果
echo "✅ 验证构建结果..."
if [ -d "dist" ]; then
    echo "✅ 构建目录存在"
    
    # 检查文件
    echo "📁 检查构建文件..."
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
        
        # 检查JS文件
        JS_FILES=$(find dist/assets -name "*.js" 2>/dev/null)
        if [ -n "$JS_FILES" ]; then
            echo "✅ JS文件已生成:"
            echo "$JS_FILES"
        else
            echo "❌ 未找到JS文件"
        fi
    fi
else
    echo "❌ 构建目录不存在"
    exit 1
fi

# 重启服务
echo "🔄 重启服务..."
sudo systemctl restart nginx

echo "✅ 服务器端修复完成！"
echo "🌐 访问地址: http://$(curl -s ifconfig.me)"
echo "📁 构建目录: /var/www/ab-testing-toolbox/frontend/dist" 