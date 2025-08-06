# AB Testing Toolbox 公共部署指南

## 🚀 快速部署方案

### 方案1: Vercel + Railway (推荐 - 免费)

#### 步骤1: 部署后端到 Railway

1. **注册 Railway 账号**
   - 访问 [railway.app](https://railway.app)
   - 使用 GitHub 账号登录

2. **创建新项目**
   ```bash
   # 克隆项目到本地
   git clone <your-repo-url>
   cd ab-testing-toolbox-v2.1.0
   
   # 推送到 GitHub
   git add .
   git commit -m "Add deployment config"
   git push origin main
   ```

3. **在 Railway 中部署**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 选择你的仓库
   - Railway 会自动检测 `railway.json` 配置

4. **配置环境变量**
   - 在 Railway 项目设置中添加：
   ```
   PORT=8000
   FLASK_ENV=production
   ```

5. **获取后端URL**
   - 部署完成后，Railway 会提供一个域名
   - 例如：`https://ab-testing-backend.railway.app`

#### 步骤2: 部署前端到 Vercel

1. **注册 Vercel 账号**
   - 访问 [vercel.com](https://vercel.com)
   - 使用 GitHub 账号登录

2. **配置前端环境变量**
   - 在项目根目录创建 `.env.local`：
   ```
   VITE_API_BASE_URL=https://your-backend-url.railway.app
   ```

3. **在 Vercel 中部署**
   - 点击 "New Project"
   - 导入 GitHub 仓库
   - Vercel 会自动检测 `vercel.json` 配置

4. **配置环境变量**
   - 在 Vercel 项目设置中添加：
   ```
   VITE_API_BASE_URL=https://your-backend-url.railway.app
   ```

### 方案2: Netlify + Render

#### 后端部署到 Render

1. **注册 Render 账号**
   - 访问 [render.com](https://render.com)

2. **创建 Web Service**
   - 选择 "New Web Service"
   - 连接 GitHub 仓库
   - 配置：
     - **Build Command**: `pip install -r backend/requirements.txt`
     - **Start Command**: `cd backend && python start_server.py`
     - **Environment**: Python 3

3. **配置环境变量**
   ```
   PORT=8000
   FLASK_ENV=production
   ```

#### 前端部署到 Netlify

1. **注册 Netlify 账号**
   - 访问 [netlify.com](https://netlify.com)

2. **创建 `netlify.toml`**
   ```toml
   [build]
     base = "frontend"
     command = "npm run build"
     publish = "dist"

   [[redirects]]
     from = "/api/*"
     to = "https://your-backend-url.onrender.com/:splat"
     status = 200
   ```

3. **部署**
   - 拖拽 `frontend/dist` 文件夹到 Netlify
   - 或连接 GitHub 仓库自动部署

### 方案3: 阿里云/腾讯云 (付费)

#### 使用云服务器

1. **购买云服务器**
   - 推荐配置：2核4GB，Ubuntu 20.04

2. **安装依赖**
   ```bash
   sudo apt update
   sudo apt install python3 python3-pip nginx
   ```

3. **部署后端**
   ```bash
   cd /var/www
   git clone <your-repo>
   cd ab-testing-toolbox-v2.1.0/backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

4. **配置 Nginx**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       # 前端静态文件
       location / {
           root /var/www/ab-testing-toolbox-v2.1.0/frontend/dist;
           try_files $uri $uri/ /index.html;
       }
       
       # 后端API代理
       location /api/ {
           proxy_pass http://127.0.0.1:8000/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

5. **使用 Supervisor 管理进程**
   ```ini
   [program:ab-testing-toolbox]
   command=/var/www/ab-testing-toolbox-v2.1.0/backend/venv/bin/python /var/www/ab-testing-toolbox-v2.1.0/backend/start_server.py
   directory=/var/www/ab-testing-toolbox-v2.1.0/backend
   user=www-data
   autostart=true
   autorestart=true
   ```

## 🔧 部署检查清单

### 后端检查
- [ ] 健康检查接口正常：`GET /health`
- [ ] CORS 配置正确
- [ ] 所有依赖安装成功
- [ ] 端口配置正确

### 前端检查
- [ ] API 地址配置正确
- [ ] 构建成功，无错误
- [ ] 静态文件路径正确
- [ ] 路由配置正确

### 集成检查
- [ ] 前后端通信正常
- [ ] 文件上传功能正常
- [ ] 所有功能模块可用
- [ ] 错误处理完善

## 📊 监控和维护

### 日志监控
```bash
# Railway/Render 日志
# 在平台控制台查看

# 自建服务器日志
tail -f /var/log/ab-testing-toolbox.log
```

### 性能监控
- 使用 [UptimeRobot](https://uptimerobot.com) 监控服务状态
- 配置告警通知

### 备份策略
- 定期备份数据库（如果有）
- 代码版本控制
- 配置文件备份

## 🆘 常见问题

### 1. CORS 错误
```python
# 在 app.py 中确保 CORS 配置正确
from flask_cors import CORS
app = Flask(__name__)
CORS(app, origins=["*"])  # 生产环境建议限制域名
```

### 2. 环境变量问题
```bash
# 检查环境变量是否正确设置
echo $VITE_API_BASE_URL
echo $FLASK_ENV
```

### 3. 端口冲突
```bash
# 检查端口占用
lsof -i :8000
netstat -tulpn | grep :8000
```

### 4. 依赖安装失败
```bash
# 清理缓存重新安装
pip cache purge
pip install -r requirements.txt --no-cache-dir
```

## 🌐 域名和SSL

### 自定义域名
1. 在域名提供商处添加 DNS 记录
2. 在部署平台配置自定义域名
3. 配置 SSL 证书（通常自动）

### HTTPS 配置
- Vercel/Netlify/Railway 自动提供 HTTPS
- 自建服务器需要配置 Let's Encrypt

## 📈 扩展建议

### 性能优化
- 启用 Gzip 压缩
- 配置 CDN
- 数据库连接池
- 缓存策略

### 安全加固
- 限制 API 访问频率
- 输入验证和过滤
- 定期更新依赖
- 安全头部配置

---

**推荐使用方案1 (Vercel + Railway)**，因为它：
- ✅ 完全免费
- ✅ 自动部署
- ✅ 内置 HTTPS
- ✅ 全球 CDN
- ✅ 易于维护 