#!/bin/bash

echo "🚀 快速修复前端样式问题..."

# 进入项目目录
cd /var/www/ab-testing-toolbox

# 备份当前配置
echo "💾 备份当前配置..."
cp frontend/src/index.css frontend/src/index.css.backup
cp frontend/package.json frontend/package.json.backup

# 进入前端目录
cd frontend

# 清理依赖和构建
echo "🧹 清理依赖和构建..."
rm -rf node_modules
rm -rf dist
rm -f package-lock.json
rm -f pnpm-lock.yaml

# 重新安装依赖（使用 legacy-peer-deps 解决冲突）
echo "📦 重新安装依赖..."
npm install --legacy-peer-deps

# 检查 vite 是否安装成功
echo "🔍 检查构建工具..."
if ! command -v npx vite &> /dev/null; then
    echo "❌ Vite 未找到，重新安装..."
    npm install --legacy-peer-deps
fi

# 重新构建
echo "🔨 重新构建前端..."
npm run build

# 检查构建结果
echo "✅ 检查构建结果..."
if [ -d "dist" ]; then
    echo "✅ 构建目录创建成功"
    
    # 检查CSS文件
    CSS_COUNT=$(find dist/assets -name "*.css" 2>/dev/null | wc -l)
    if [ $CSS_COUNT -gt 0 ]; then
        echo "✅ 找到 $CSS_COUNT 个CSS文件"
        find dist/assets -name "*.css" -exec echo "  - {}" \;
    else
        echo "❌ 未找到CSS文件"
    fi
    
    # 检查JS文件
    JS_COUNT=$(find dist/assets -name "*.js" 2>/dev/null | wc -l)
    if [ $JS_COUNT -gt 0 ]; then
        echo "✅ 找到 $JS_COUNT 个JS文件"
    else
        echo "❌ 未找到JS文件"
    fi
else
    echo "❌ 构建失败"
    exit 1
fi

# 重启Nginx
echo "🔄 重启Nginx..."
sudo systemctl restart nginx

echo "✅ 样式修复完成！"
echo "🌐 请访问: http://$(curl -s ifconfig.me)"
echo "📁 构建目录: /var/www/ab-testing-toolbox/frontend/dist" 