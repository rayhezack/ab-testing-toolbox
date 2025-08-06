# 前端样式修复指南

## 问题描述

部署到阿里云服务器后，前端样式丢失，页面显示为无样式的原始HTML。

## 问题原因

1. **Tailwind CSS 配置问题**：项目使用了 Tailwind CSS v4，但配置不正确
2. **CSS 导入问题**：`index.css` 文件为空，没有正确导入样式
3. **构建配置问题**：Vite 配置需要调整以正确处理 CSS

## 修复方案

### 方案一：快速修复（推荐）

在服务器上执行以下命令：

```bash
# 下载修复脚本
wget https://raw.githubusercontent.com/rayhezack/ab-testing-toolbox/main/quick-fix-styles.sh

# 给脚本执行权限
chmod +x quick-fix-styles.sh

# 执行修复
./quick-fix-styles.sh
```

### 方案二：手动修复

1. **进入项目目录**
```bash
cd /var/www/ab-testing-toolbox
```

2. **更新代码**
```bash
git pull origin main
```

3. **进入前端目录**
```bash
cd frontend
```

4. **清理并重新安装依赖**
```bash
rm -rf node_modules dist
rm -f package-lock.json pnpm-lock.yaml
npm install
```

5. **重新构建**
```bash
npm run build
```

6. **重启Nginx**
```bash
sudo systemctl restart nginx
```

## 修复内容

### 1. CSS 配置修复

- 将 `index.css` 从空文件修复为包含完整的 Tailwind CSS 导入
- 添加了正确的 CSS 变量定义
- 配置了深色模式支持

### 2. 依赖版本修复

- 将 Tailwind CSS 从 v4 降级到兼容的 v3.4.17
- 移除了不兼容的 `@tailwindcss/vite` 和 `tw-animate-css`
- 添加了必要的 PostCSS 和 Autoprefixer 依赖

### 3. 构建配置修复

- 简化了 Vite 配置
- 移除了 Tailwind CSS v4 特定的配置
- 确保 CSS 文件能正确生成

## 验证修复

修复完成后，检查以下内容：

1. **构建目录**：`/var/www/ab-testing-toolbox/frontend/dist`
2. **CSS 文件**：`dist/assets/index-*.css`
3. **JS 文件**：`dist/assets/index-*.js`
4. **页面访问**：`http://你的服务器IP`

## 常见问题

### Q: 修复后仍然没有样式？
A: 检查浏览器开发者工具的网络面板，确认CSS文件是否成功加载。

### Q: 构建失败？
A: 检查Node.js版本，确保使用Node.js 18或更高版本。

### Q: Nginx配置问题？
A: 检查 `/etc/nginx/sites-available/ab-testing-toolbox` 配置是否正确。

## 联系支持

如果问题仍然存在，请提供以下信息：
1. 服务器操作系统版本
2. Node.js 版本
3. 构建错误日志
4. 浏览器控制台错误信息 