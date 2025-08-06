#!/bin/bash

echo "🔍 全面诊断和修复脚本"

# 进入项目目录
cd /var/www/ab-testing-toolbox

# 更新代码
echo "📥 更新代码..."
git pull origin main

# 检查系统状态
echo "🔍 检查系统状态..."
echo "Node.js 版本: $(node --version)"
echo "npm 版本: $(npm --version)"
echo "Nginx 状态: $(systemctl is-active nginx)"
echo "后端服务状态: $(systemctl is-active ab-testing-backend)"

# 检查后端服务
echo "🔍 检查后端服务..."
if ! systemctl is-active --quiet ab-testing-backend; then
    echo "❌ 后端服务未运行，正在启动..."
    sudo systemctl start ab-testing-backend
    sudo systemctl enable ab-testing-backend
    sleep 3
fi

# 检查后端端口
echo "🔍 检查后端端口..."
if ! netstat -tlnp | grep :8000; then
    echo "❌ 后端端口8000未监听"
    echo "检查后端日志:"
    sudo journalctl -u ab-testing-backend -n 10
else
    echo "✅ 后端端口8000正在监听"
fi

# 测试后端API
echo "🔍 测试后端API..."
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ 后端API直接访问正常"
else
    echo "❌ 后端API直接访问失败"
fi

# 进入前端目录
cd frontend

# 检查前端构建
echo "🔍 检查前端构建..."
if [ ! -d "dist" ]; then
    echo "❌ 前端构建目录不存在，重新构建..."
    rm -rf node_modules dist
    rm -f package-lock.json pnpm-lock.yaml
    npm cache clean --force
    npm install --legacy-peer-deps --force
    npm run build
else
    echo "✅ 前端构建目录存在"
fi

# 检查CSS文件
echo "🔍 检查CSS文件..."
CSS_FILES=$(find dist/assets -name "*.css" 2>/dev/null)
if [ -n "$CSS_FILES" ]; then
    echo "✅ CSS文件存在:"
    echo "$CSS_FILES"
    
    # 检查CSS文件内容
    CSS_FILE=$(echo "$CSS_FILES" | head -1)
    if grep -q "hero-section" "$CSS_FILE"; then
        echo "✅ CSS文件包含自定义样式"
    else
        echo "❌ CSS文件缺少自定义样式"
    fi
else
    echo "❌ 未找到CSS文件"
fi

# 检查HTML文件
echo "🔍 检查HTML文件..."
if [ -f "dist/index.html" ]; then
    echo "✅ HTML文件存在"
    if grep -q "assets/index-.*\.css" dist/index.html; then
        echo "✅ HTML文件正确引用了CSS"
    else
        echo "❌ HTML文件未正确引用CSS"
    fi
else
    echo "❌ HTML文件不存在"
fi

# 重启Nginx
echo "🔄 重启Nginx..."
sudo systemctl restart nginx

# 测试前端访问
echo "🔍 测试前端访问..."
sleep 2
if curl -f http://localhost/ > /dev/null 2>&1; then
    echo "✅ 前端访问正常"
else
    echo "❌ 前端访问失败"
fi

# 测试API代理
echo "🔍 测试API代理..."
if curl -f http://localhost/api/health > /dev/null 2>&1; then
    echo "✅ API代理正常"
else
    echo "❌ API代理失败"
    echo "检查Nginx错误日志:"
    sudo tail -n 10 /var/log/nginx/error.log
fi

# 检查Nginx配置
echo "🔍 检查Nginx配置..."
if sudo nginx -t; then
    echo "✅ Nginx配置正确"
else
    echo "❌ Nginx配置错误"
fi

# 显示最终状态
echo "📊 最终状态报告:"
echo "前端构建: $([ -d "dist" ] && echo "✅" || echo "❌")"
echo "CSS文件: $([ -n "$CSS_FILES" ] && echo "✅" || echo "❌")"
echo "后端服务: $(systemctl is-active ab-testing-backend)"
echo "Nginx服务: $(systemctl is-active nginx)"
echo "后端端口: $(netstat -tlnp | grep :8000 > /dev/null && echo "✅" || echo "❌")"

echo "✅ 诊断完成！"
echo "🌐 访问地址: http://$(curl -s ifconfig.me)"
echo "🔍 API健康检查: http://$(curl -s ifconfig.me)/api/health" 