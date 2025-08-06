# 阿里云部署指南

## 🚀 快速部署步骤

### 第一步：购买阿里云ECS

1. **登录阿里云控制台** (https://ecs.console.aliyun.com)
2. **创建实例**：
   - **付费方式**：按量付费（更灵活）
   - **地域**：选择离您最近的区域
   - **实例规格**：2核4GB（推荐）
   - **镜像**：Ubuntu 20.04 LTS
   - **带宽**：5Mbps
   - **系统盘**：40GB

### 第二步：连接服务器

购买完成后，使用SSH连接：
```bash
ssh root@您的服务器公网IP
```

### 第三步：一键部署

连接服务器后，执行以下命令：

```bash
# 下载部署脚本
wget https://raw.githubusercontent.com/rayhezack/ab-testing-toolbox/main/deploy-aliyun.sh

# 给脚本执行权限
chmod +x deploy-aliyun.sh

# 执行部署
./deploy-aliyun.sh
```

### 第四步：验证部署

部署完成后，访问：
- **主页面**：http://您的服务器IP
- **健康检查**：http://您的服务器IP/health

## 🔧 管理命令

```bash
# 查看服务状态
sudo systemctl status ab-testing-backend
sudo systemctl status nginx

# 重启服务
sudo systemctl restart ab-testing-backend
sudo systemctl restart nginx

# 查看日志
sudo journalctl -u ab-testing-backend -f

# 更新代码
cd /var/www/ab-testing-toolbox
git pull origin main
sudo systemctl restart ab-testing-backend
```

## 💰 费用估算

- **ECS实例**：2核4GB ≈ 100元/月
- **带宽**：5Mbps ≈ 30元/月
- **总计**：约130元/月

## 🔒 安全配置

1. **修改SSH端口**
2. **配置防火墙**
3. **定期更新系统**
4. **备份数据**

## 📞 技术支持

如遇问题，请检查：
1. 服务器是否正常运行
2. 防火墙是否开放80端口
3. 服务是否正常启动
4. 日志文件中的错误信息 