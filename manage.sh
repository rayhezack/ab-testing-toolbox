#!/bin/bash

case "$1" in
    start)
        echo "🚀 启动服务..."
        sudo systemctl start ab-testing-backend
        sudo systemctl start nginx
        ;;
    stop)
        echo "⏹️ 停止服务..."
        sudo systemctl stop ab-testing-backend
        sudo systemctl stop nginx
        ;;
    restart)
        echo "🔄 重启服务..."
        sudo systemctl restart ab-testing-backend
        sudo systemctl restart nginx
        ;;
    status)
        echo "📊 服务状态:"
        sudo systemctl status ab-testing-backend
        echo ""
        sudo systemctl status nginx
        ;;
    logs)
        echo "📋 查看日志:"
        sudo journalctl -u ab-testing-backend -f
        ;;
    update)
        echo "🔄 更新代码..."
        cd /var/www/ab-testing-toolbox
        git pull origin main
        
        echo "🐍 更新后端..."
        cd backend
        source venv/bin/activate
        pip install -r requirements.txt
        sudo systemctl restart ab-testing-backend
        
        echo "⚛️ 更新前端..."
        cd ../frontend
        npm install
        npm run build
        sudo systemctl restart nginx
        
        echo "✅ 更新完成！"
        ;;
    *)
        echo "使用方法: $0 {start|stop|restart|status|logs|update}"
        exit 1
        ;;
esac 