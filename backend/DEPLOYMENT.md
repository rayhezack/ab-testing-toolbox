# AB Testing Toolbox 部署指南

## 项目概述
AB Testing Toolbox 是一个完整的A/B测试工具，包含前端界面和后端API服务。

## 系统要求
- Python 3.8+
- Node.js 16+
- 内存: 至少2GB
- 磁盘空间: 至少500MB

## 后端部署步骤

### 1. 环境准备
```bash
# 创建项目目录
mkdir ab-testing-toolbox
cd ab-testing-toolbox

# 创建Python虚拟环境
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# 或 venv\Scripts\activate  # Windows
```

### 2. 安装依赖
```bash
# 升级pip
pip install --upgrade pip

# 安装Python依赖
pip install -r requirements.txt
```

### 3. 启动后端服务
```bash
# 方法1: 使用启动脚本
python start_server.py

# 方法2: 直接启动Flask
python app.py

# 方法3: 使用Flask命令
export FLASK_APP=app.py
export FLASK_ENV=production
flask run --host=0.0.0.0 --port=8000
```

### 4. 验证部署
```bash
# 健康检查
curl http://localhost:8000/health

# 应该返回: {"status": "healthy", "message": "AB Testing Toolbox Backend is running"}
```

## 前端部署步骤

### 1. 安装依赖
```bash
cd frontend
npm install
# 或使用pnpm
pnpm install
```

### 2. 构建生产版本
```bash
npm run build
# 或
pnpm build
```

### 3. 部署到Web服务器
将 `dist` 目录的内容复制到Web服务器的静态文件目录。

## 常见问题解决

### 1. 端口被占用
```bash
# 查找占用端口的进程
lsof -i :8000
# 或
netstat -tulpn | grep :8000

# 终止进程
kill -9 <PID>
```

### 2. 依赖安装失败
```bash
# 清理缓存重新安装
pip cache purge
pip install -r requirements.txt --no-cache-dir
```

### 3. 权限问题
```bash
# 确保脚本有执行权限
chmod +x start_server.py
```

### 4. 环境变量问题
```bash
# 设置必要的环境变量
export PYTHONPATH=/path/to/your/project
export FLASK_ENV=production
```

## 生产环境建议

### 1. 使用Gunicorn (推荐)
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

### 2. 使用Nginx反向代理
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. 使用Supervisor管理进程
```ini
[program:ab-testing-toolbox]
command=/path/to/venv/bin/python /path/to/start_server.py
directory=/path/to/project
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/ab-testing-toolbox.log
```

## 监控和日志

### 1. 查看日志
```bash
# 如果使用supervisor
tail -f /var/log/ab-testing-toolbox.log

# 直接查看Flask日志
tail -f app.log
```

### 2. 监控服务状态
```bash
# 健康检查
curl http://localhost:8000/health

# 检查进程
ps aux | grep python
```

## 故障排除

### 1. 应用无法启动
- 检查Python版本: `python3 --version`
- 检查虚拟环境: `which python`
- 检查依赖: `pip list`
- 查看错误日志

### 2. API请求失败
- 检查CORS配置
- 检查端口是否正确
- 检查防火墙设置
- 查看浏览器控制台错误

### 3. 前端无法连接后端
- 检查后端服务是否运行
- 检查API地址配置
- 检查网络连接
- 查看浏览器网络面板

## 联系支持
如遇到部署问题，请检查：
1. 系统要求是否满足
2. 依赖是否正确安装
3. 端口是否被占用
4. 防火墙设置
5. 日志文件中的错误信息 