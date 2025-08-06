#!/bin/bash

# 安装依赖
echo "Installing Python dependencies..."
pip install -r requirements.txt

# 启动Flask服务器
echo "Starting Flask server..."
python app.py 