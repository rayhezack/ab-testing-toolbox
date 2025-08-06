#!/usr/bin/env python3
"""
AB Testing Toolbox Backend Server
启动脚本 - 确保应用正确运行
"""

import os
import sys
from app import app

if __name__ == '__main__':
    # 设置环境变量
    os.environ['FLASK_ENV'] = 'production'
    os.environ['FLASK_DEBUG'] = '0'
    
    # 启动服务器
    print("Starting AB Testing Toolbox Backend Server...")
    print("Server will be available at: http://0.0.0.0:8000")
    print("Health check: http://0.0.0.0:8000/health")
    
    try:
        app.run(
            host='0.0.0.0',
            port=8000,
            debug=False,
            threaded=True
        )
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1) 