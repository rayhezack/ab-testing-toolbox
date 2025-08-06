# AB Testing Toolbox v2.1.0

一个完整的A/B测试工具，包含样本量计算、实验分析、显著性检验和重随机化功能。

## 项目结构

```
ab-testing-toolbox-v2.1.0/
├── backend/                 # 后端API服务
│   ├── app.py              # Flask主应用
│   ├── requirements.txt    # Python依赖
│   ├── start_server.py     # 启动脚本
│   ├── DEPLOYMENT.md       # 部署指南
│   └── ...                 # 其他后端文件
├── frontend/               # 前端React应用
│   ├── package.json        # Node.js依赖
│   ├── src/                # 源代码
│   └── ...                 # 其他前端文件
└── README.md               # 项目说明
```

## 快速开始

### 后端启动
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
python start_server.py
```

### 前端启动
```bash
cd frontend
npm install
npm run dev
```

## 功能特性

- **样本量计算**: 支持均值、比例指标类型
- **实验分析**: 支持均值、比例、比率指标检验
- **显著性检验**: 多种统计检验方法
- **重随机化**: 多指标平衡优化

## 详细部署说明

请参考 `backend/DEPLOYMENT.md` 获取完整的部署指南。

## 版本历史

- v2.1.0: 优化部署配置，修复依赖问题
- v2.0.0: 支持比率指标，完善重随机化功能
- v1.0.0: 初始版本 