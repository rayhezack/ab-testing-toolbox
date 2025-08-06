#!/bin/bash

echo "🚀 开始部署 AB Testing Toolbox 到阿里云..."

# 更新系统
echo "📦 更新系统包..."
sudo apt update && sudo apt upgrade -y

# 安装依赖
echo "🔧 安装必要软件..."
sudo apt install -y python3 python3-pip python3-venv nginx git curl

# 安装Node.js (阿里云镜像源)
echo "📦 安装Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 创建项目目录
echo "📁 创建项目目录..."
sudo mkdir -p /var/www/ab-testing-toolbox
sudo chown $USER:$USER /var/www/ab-testing-toolbox
cd /var/www/ab-testing-toolbox

# 克隆项目
echo "📥 克隆项目代码..."
git clone https://github.com/rayhezack/ab-testing-toolbox.git .

# 部署后端
echo "🐍 部署后端..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 创建后端服务文件
echo "⚙️ 配置后端服务..."
sudo tee /etc/systemd/system/ab-testing-backend.service > /dev/null <<EOF
[Unit]
Description=AB Testing Toolbox Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/ab-testing-toolbox/backend
Environment=PATH=/var/www/ab-testing-toolbox/backend/venv/bin
ExecStart=/var/www/ab-testing-toolbox/backend/venv/bin/python start_server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 启动后端服务
sudo systemctl daemon-reload
sudo systemctl enable ab-testing-backend
sudo systemctl start ab-testing-backend

# 部署前端
echo "⚛️ 部署前端..."
cd ../frontend

# 安装依赖
echo "📦 安装前端依赖..."
npm install

# 清理之前的构建
echo "🧹 清理之前的构建..."
rm -rf dist

# 构建前端
echo "🔨 构建前端..."
npm run build

# 验证构建结果
echo "✅ 验证构建结果..."
if [ ! -d "dist" ]; then
    echo "❌ 前端构建失败！"
    exit 1
fi

# 检查CSS文件是否存在
if [ ! -f "dist/assets/index-*.css" ]; then
    echo "❌ CSS文件未生成！"
    exit 1
fi

echo "✅ 前端构建成功！"

# 配置Nginx
echo "🌐 配置Nginx..."
sudo cp ../nginx.conf /etc/nginx/sites-available/ab-testing-toolbox
sudo ln -sf /etc/nginx/sites-available/ab-testing-toolbox /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 测试Nginx配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# 配置防火墙
echo "🔥 配置防火墙..."
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

echo "✅ 部署完成！"
echo "🌐 访问地址: http://$(curl -s ifconfig.me)"
echo "🔍 健康检查: http://$(curl -s ifconfig.me)/health"
echo "📊 后端状态: sudo systemctl status ab-testing-backend"
echo "🌐 Nginx状态: sudo systemctl status nginx"
echo "📁 前端构建目录: /var/www/ab-testing-toolbox/frontend/dist" 