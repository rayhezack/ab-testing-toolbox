# 数据科学工具箱 (AB Testing Toolbox)

一个完整的数据科学工具箱，包含样本量计算器、显著性检验和重随机三个核心模块。

## 功能特性

### 1. 样本量计算器
- 支持均值、比例、比率三种指标类型
- 自动计算实验所需样本量和实验天数
- 可视化展示不同MDE下的样本量需求

### 2. 显著性检验
- 支持Welch's t-test、比例检验、比率检验
- 自动识别对照组和实验组
- 智能列名映射
- 多重比较校正
- 结果导出功能

### 3. 重随机模块
- 基于SeedFinder算法的重随机
- 最小化多指标间的组间不平衡
- 可视化T统计量分布
- 最佳种子选择

## 技术栈

### 前端
- React 18
- Vite
- Tailwind CSS
- Shadcn/ui 组件库
- Recharts 图表库

### 后端
- Python Flask
- Pandas
- NumPy
- SciPy
- Statsmodels

## 安装和运行

### 1. 安装前端依赖

```bash
cd ab-testing-toolbox
npm install
# 或者使用 pnpm
pnpm install
```

### 2. 安装后端依赖

```bash
cd upload
pip install -r requirements.txt
```

### 3. 启动后端服务器

```bash
cd upload
python app.py
```

后端服务器将在 http://localhost:8000 启动

### 4. 启动前端开发服务器

```bash
cd ab-testing-toolbox
npm run dev
# 或者使用 pnpm
pnpm dev
```

前端应用将在 http://localhost:5173 启动

## 使用说明

### 样本量计算器
1. 选择指标类型（均值/比例/比率）
2. 输入基准值和方差
3. 设置MDE（最小可检测效应）
4. 配置实验参数（日流量、采样比例等）
5. 查看计算结果

### 显著性检验
1. 上传CSV数据文件
2. 系统自动识别分组列和指标列
3. 配置检验参数（显著性水平、多重比较等）
4. 运行统计检验
5. 查看结果表格并导出

### 重随机模块
1. 上传CSV数据文件
2. 选择用户ID列和指标列
3. 设置重随机参数（迭代次数、组别比例）
4. 运行重随机算法
5. 查看最佳种子和T统计量分布

## 数据格式要求

### CSV文件格式
- 必须包含用户ID列
- 必须包含分组列（如group_name）
- 指标列应为数值型
- 支持中文列名

### 示例数据格式
```csv
user_id,group_name,order_count,GMV,retention
user_000000,control_group,5,506.03,1
user_000001,treatment_group,4,420.78,0
```

## API端点

- `POST /sample-size` - 样本量计算
- `POST /experiment-analysis` - 显著性检验
- `POST /rerandomization` - 重随机
- `GET /health` - 健康检查

## 故障排除

### 常见问题

1. **页面空白**
   - 检查后端服务器是否正常运行
   - 确认API端点地址正确
   - 查看浏览器控制台错误信息

2. **重随机报错**
   - 检查数据格式是否正确
   - 确认用户ID列和指标列存在
   - 验证数据不为空

3. **显著性检验失败**
   - 检查分组列是否正确识别
   - 确认指标列包含有效数值
   - 验证对照组和实验组数据

### 调试步骤

1. 检查后端日志
2. 查看浏览器Network面板
3. 验证数据文件格式
4. 确认所有依赖已正确安装

## 开发说明

### 项目结构
```
ab-testing-toolbox/
├── src/
│   ├── components/
│   │   ├── SampleSizeCalculator.jsx
│   │   ├── SignificanceTest.jsx
│   │   └── Rerandomization.jsx
│   └── ...
└── upload/
    ├── app.py
    ├── SampleCalculator.py
    ├── experiment_analysis_with_seedfinder.py
    └── requirements.txt
```

### 贡献指南
1. Fork项目
2. 创建功能分支
3. 提交更改
4. 发起Pull Request

## 许可证

MIT License 