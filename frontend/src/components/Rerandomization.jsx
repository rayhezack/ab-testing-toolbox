import { useState, useRef } from 'react'
import { Shuffle, Upload, Download, FileText, Target } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts'

const Rerandomization = () => {
  const [uploadedData, setUploadedData] = useState(null)
  const [dataPreview, setDataPreview] = useState([])
  const [columns, setColumns] = useState([])
  const [formData, setFormData] = useState({
    groupColumn: '',
    userIdColumn: '',
    metricConfigs: [], // 改为配置数组，每个指标可以有自己的类型
    iterations: 1000,
    groups: [
      { name: 'control', proportion: 50, label: '对照组' },
      { name: 'treatment1', proportion: 50, label: '实验组1' }
    ]
  })
  const [results, setResults] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef(null)

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target.result
        const lines = text.split('\n').filter(line => line.trim())
        const headers = lines[0].split(',').map(h => h.trim())
        
        // 解析前几行数据作为预览
        const preview = lines.slice(1, 6).map(line => {
          const values = line.split(',')
          const row = {}
          headers.forEach((header, index) => {
            row[header] = values[index]?.trim() || ''
          })
          return row
        })

        setColumns(headers)
        setDataPreview(preview)
        setUploadedData(text)

        // 智能列名识别
        const smartMapping = smartColumnMapping(headers)
        setFormData(prev => ({
          ...prev,
          ...smartMapping
        }))

      } catch (error) {
        console.error('文件解析错误:', error)
      }
    }
    reader.readAsText(file)
  }

  const smartColumnMapping = (headers) => {
    const mapping = {}
    
    // 分组列识别
    const groupKeywords = ['group', 'test', 'control', 'exp', 'treatment', '分组', '组别']
    const groupCol = headers.find(h => 
      groupKeywords.some(keyword => h.toLowerCase().includes(keyword.toLowerCase()))
    )
    if (groupCol) mapping.groupColumn = groupCol

    // 用户ID列识别
    const idKeywords = ['id', 'user', 'uuid', 'userid', '用户', '用户id']
    const idCol = headers.find(h => 
      idKeywords.some(keyword => h.toLowerCase().includes(keyword.toLowerCase()))
    )
    if (idCol) mapping.userIdColumn = idCol

    // 指标列识别（数值型列，排除分组和ID列）
    const metricCols = headers.filter(h => 
      !groupKeywords.some(keyword => h.toLowerCase().includes(keyword.toLowerCase())) &&
      !idKeywords.some(keyword => h.toLowerCase().includes(keyword.toLowerCase()))
    )
    if (metricCols.length > 0) {
      mapping.metricConfigs = metricCols.slice(0, 3).map(col => ({
        column: col,
        type: 'mean', // 默认为均值类型
        numerator: '',
        denominator: ''
      }))
    }

    return mapping
  }

  // 指标类型配置和说明
  const metricTypeConfigs = {
    mean: {
      label: '均值',
      description: '连续型指标，如GMV、订单金额等',
      examples: 'GMV、订单金额、用户时长'
    },
    proportion: {
      label: '比例',
      description: '二值型指标，如转化率、留存率等',
      examples: '转化率、留存率、点击率'
    },
    ratio: {
      label: '比率',
      description: '需要选择分子和分母的比率指标',
      examples: 'ARPU、客单价、人均订单数'
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const addMetricConfig = () => {
    const availableColumns = getNumericColumns()
    
    if (availableColumns.length > 0) {
      setFormData(prev => ({
        ...prev,
        metricConfigs: [...prev.metricConfigs, {
          column: availableColumns[0],
          type: 'mean',
          numerator: '',
          denominator: ''
        }]
      }))
    }
  }

  const removeMetricConfig = (index) => {
    setFormData(prev => ({
      ...prev,
      metricConfigs: prev.metricConfigs.filter((_, i) => i !== index)
    }))
  }

  const updateMetricConfig = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      metricConfigs: prev.metricConfigs.map((config, i) => 
        i === index ? { ...config, [field]: value } : config
      )
    }))
  }

  const getNumericColumns = () => {
    if (!columns.length) return []
    
    const groupKeywords = ['group', 'test', 'control', 'exp', 'treatment', '分组', '组别']
    const idKeywords = ['id', 'user', 'uuid', 'userid', '用户', '用户id']
    
    return columns.filter(col => 
      !groupKeywords.some(keyword => col.toLowerCase().includes(keyword.toLowerCase())) &&
      !idKeywords.some(keyword => col.toLowerCase().includes(keyword.toLowerCase()))
    )
  }

  const handleGroupProportionChange = (group, value) => {
    const numValue = parseInt(value) || 0
    const otherGroup = group === 'control' ? 'treatment' : 'control'
    const otherValue = 100 - numValue
    
    setFormData(prev => ({
      ...prev,
      groupProportions: {
        ...prev.groupProportions,
        [group]: numValue,
        [otherGroup]: otherValue
      }
    }))
  }

  const addGroup = () => {
    const newGroupIndex = formData.groups.length
    const newGroup = {
      name: `treatment${newGroupIndex}`,
      proportion: 0,
      label: `实验组${newGroupIndex}`
    }
    
    setFormData(prev => ({
      ...prev,
      groups: [...prev.groups, newGroup]
    }))
  }

  const removeGroup = (index) => {
    if (formData.groups.length <= 2) {
      alert('至少需要保留对照组和一个实验组')
      return
    }
    
    setFormData(prev => ({
      ...prev,
      groups: prev.groups.filter((_, i) => i !== index)
    }))
  }

  const updateGroupProportion = (index, proportion) => {
    const numValue = parseInt(proportion) || 0
    
    setFormData(prev => {
      const newGroups = [...prev.groups]
      newGroups[index].proportion = numValue
      
      // 重新分配比例，确保总和为100%
      const totalProportion = newGroups.reduce((sum, group) => sum + group.proportion, 0)
      
      if (totalProportion > 100) {
        // 如果超过100%，按比例重新分配
        newGroups.forEach(group => {
          group.proportion = Math.round((group.proportion / totalProportion) * 100)
        })
      } else if (totalProportion < 100) {
        // 如果不足100%，将剩余比例分配给第一个非零组
        const remaining = 100 - totalProportion
        for (let i = 0; i < newGroups.length; i++) {
          if (newGroups[i].proportion > 0) {
            newGroups[i].proportion += remaining
            break
          }
        }
      }
      
      return {
        ...prev,
        groups: newGroups
      }
    })
  }

  const updateGroupLabel = (index, label) => {
    setFormData(prev => {
      const newGroups = [...prev.groups]
      newGroups[index].label = label
      return {
        ...prev,
        groups: newGroups
      }
    })
  }

  const runRerandomization = async () => {
    if (!uploadedData || !formData.userIdColumn || formData.metricConfigs.length === 0) {
      alert('请确保已上传数据并选择了必要的列')
      return
    }

    // 验证指标配置
    for (const config of formData.metricConfigs) {
      if (config.type === 'ratio') {
        if (!config.numerator || !config.denominator) {
          alert('比率类型指标必须选择分子和分母列')
          return
        }
      } else {
        if (!config.column) {
          alert('请为所有指标选择指标列')
          return
        }
      }
    }

    // 验证组别比例总和是否为100%
    const totalProportion = formData.groups.reduce((sum, group) => sum + group.proportion, 0)
    if (totalProportion !== 100) {
      alert(`组别比例总和必须为100%，当前为${totalProportion}%`)
      return
    }

    setIsProcessing(true)
    setProgress(0)
    
    try {
      // 解析数据
      const lines = uploadedData.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim())
      const data = lines.slice(1).map(line => {
        const values = line.split(',')
        const row = {}
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim() || ''
        })
        return row
      }).filter(row => row[formData.userIdColumn])

      // 转换组别配置为后端期望的格式
      const groupProportions = {}
      formData.groups.forEach(group => {
        groupProportions[group.name] = group.proportion
      })

      // 转换指标配置为后端期望的格式
      const selectedMetrics = formData.metricConfigs.map(config => {
        if (config.type === 'ratio') {
          // 使用数组格式：[numerator, denominator]
          return [config.numerator, config.denominator]
        }
        return config.column
      })
      const metricTypes = {}
      formData.metricConfigs.forEach(config => {
        if (config.type === 'ratio') {
          // 使用JSON字符串作为键，避免转义字符问题
          const key = JSON.stringify([config.numerator, config.denominator])
          metricTypes[key] = config.type
        } else {
          metricTypes[config.column] = config.type
        }
      })

      const requestBody = {
        data: data,
        selectedMetrics: selectedMetrics,
        metricTypes: metricTypes,
        userIdColumn: formData.userIdColumn,
        iterations: formData.iterations,
        groupProportions: groupProportions
      }

      // 调试信息
      console.log('DEBUG: selectedMetrics =', selectedMetrics)
      console.log('DEBUG: metricTypes =', metricTypes)
      console.log('DEBUG: requestBody =', requestBody)

      const response = await fetch("http://localhost:8000/rerandomization", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();

      // 生成直方图数据
      const histogramData = generateHistogramData(result.allTStats, result.topSeeds[0]?.maxTStat || 0)

      setResults({
        bestSeed: result.bestSeed,
        topSeeds: result.topSeeds,
        bestScore: result.topSeeds[0]?.maxTStat || 0,
        histogram: histogramData,
        totalIterations: formData.iterations,
        bestSeedResults: result.bestSeedResults // 新增：存储显著性检验结果
      })

    } catch (error) {
      console.error('重随机错误:', error)
      alert(`重随机过程中出现错误: ${error.message}，请检查数据格式或后端服务是否运行`)
    } finally {
      setIsProcessing(false)
      setProgress(0)
    }
  }

  const generateHistogramData = (allTStats, bestScore) => {
    if (!allTStats || allTStats.length === 0) return []
    
    const bins = 20
    const min = Math.min(...allTStats)
    const max = Math.max(...allTStats)
    const binWidth = (max - min) / bins
    
    const histogram = Array(bins).fill(0).map((_, i) => ({
      bin: (min + i * binWidth).toFixed(2),
      count: 0,
      isBest: false
    }))
    
    allTStats.forEach(tStat => {
      const binIndex = Math.min(Math.floor((tStat - min) / binWidth), bins - 1)
      histogram[binIndex].count++
    })
    
    // 标记最佳种子所在的区间
    if (bestScore) {
      const bestBinIndex = Math.min(Math.floor((bestScore - min) / binWidth), bins - 1)
      histogram[bestBinIndex].isBest = true
    }
    
    return histogram
  }

  const exportResults = () => {
    if (!results) return
    
    const csvContent = [
      ['排名', '种子', '最大T统计量'],
      ...results.topSeeds.map((seed, index) => [index + 1, seed.seed, seed.maxTStat.toFixed(4)])
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'rerandomization_results.csv'
    link.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Shuffle className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">重随机 (SeedFinder)</h2>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 数据上传和配置 */}
        <Card className="toolbox-card">
          <CardHeader>
            <CardTitle>数据上传与配置</CardTitle>
            <CardDescription>上传数据并配置重随机参数</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 文件上传 */}
            <div className="space-y-2">
              <Label>数据文件</Label>
              <div 
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  点击上传CSV文件或拖拽文件到此处
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* 数据预览 */}
            {dataPreview.length > 0 && (
              <div className="space-y-2">
                <Label>数据预览</Label>
                <div className="max-h-32 overflow-auto border border-border rounded">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-secondary">
                        {columns.map(col => (
                          <th key={col} className="px-2 py-1 text-left">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dataPreview.map((row, index) => (
                        <tr key={index} className="border-t border-border">
                          {columns.map(col => (
                            <td key={col} className="px-2 py-1">{row[col]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 列选择 */}
            {columns.length > 0 && (
              <>
                <div className="space-y-2">
                  <Label>用户ID列</Label>
                  <Select value={formData.userIdColumn} onValueChange={(value) => handleInputChange('userIdColumn', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择用户ID列" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 指标配置 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>指标配置</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        为每个指标选择合适的类型，系统将使用相应的统计检验方法
                      </p>
                    </div>
                    <Button 
                      onClick={addMetricConfig} 
                      variant="outline" 
                      size="sm"
                    >
                      添加指标
                    </Button>
                  </div>
                  
                  {/* 指标类型帮助提示 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <div className="text-blue-600 mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                          <path d="M12 17h.01"/>
                        </svg>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium text-blue-900 mb-1">指标类型选择指南</div>
                        <div className="text-blue-800 space-y-1">
                          <div><strong>均值：</strong>连续型数值，如GMV、订单金额、用户时长等</div>
                          <div><strong>比例：</strong>二值型指标（0/1），如转化率、留存率、点击率等</div>
                          <div><strong>比率：</strong>需要选择分子和分母的比率指标，如ARPU、客单价等</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.metricConfigs.map((config, index) => (
                      <div key={index} className="border border-border rounded-lg p-4 bg-card">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                          <div className="space-y-1">
                            <Label className="text-xs">指标类型</Label>
                            <Select 
                              value={config.type} 
                              onValueChange={(value) => updateMetricConfig(index, 'type', value)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(metricTypeConfigs).map(([key, config]) => (
                                  <SelectItem key={key} value={key}>
                                    {config.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* 根据指标类型显示不同的选择界面 */}
                          {config.type === 'ratio' ? (
                            // 比率类型：显示分子和分母选择
                            <div className="md:col-span-2 grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">分子 (X)</Label>
                                <Select 
                                  value={config.numerator || ''} 
                                  onValueChange={(value) => updateMetricConfig(index, 'numerator', value)}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="选择分子列" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getNumericColumns().map(col => (
                                      <SelectItem key={col} value={col}>{col}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">分母 (Y)</Label>
                                <Select 
                                  value={config.denominator || ''} 
                                  onValueChange={(value) => updateMetricConfig(index, 'denominator', value)}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="选择分母列" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getNumericColumns().map(col => (
                                      <SelectItem key={col} value={col}>{col}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ) : (
                            // 其他类型：显示指标列选择
                            <div className="space-y-1">
                              <Label className="text-xs">指标列</Label>
                              <Select 
                                value={config.column} 
                                onValueChange={(value) => updateMetricConfig(index, 'column', value)}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {getNumericColumns().map(col => (
                                    <SelectItem key={col} value={col}>{col}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeMetricConfig(index)}
                              className="h-9 w-9 p-0"
                            >
                              <span className="sr-only">删除指标</span>
                              ×
                            </Button>
                          </div>
                        </div>
                        
                        {/* 指标类型说明 */}
                        <div className="mt-3 p-2 bg-muted/50 rounded text-xs">
                          <div className="font-medium text-muted-foreground mb-1">
                            {metricTypeConfigs[config.type]?.label} - {metricTypeConfigs[config.type]?.description}
                          </div>
                          <div className="text-muted-foreground">
                            适用场景：{metricTypeConfigs[config.type]?.examples}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {formData.metricConfigs.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      <p>请添加至少一个指标进行重随机</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>迭代次数</Label>
                  <Input
                    type="number"
                    value={formData.iterations}
                    onChange={(e) => handleInputChange('iterations', parseInt(e.target.value) || 1000)}
                    className="toolbox-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label>分组配置</Label>
                  <div className="space-y-3">
                    {formData.groups.map((group, index) => (
                      <div key={group.name} className="flex items-center space-x-2 p-3 border rounded-lg">
                        <div className="flex-1">
                          <Label className="text-xs">组别名称</Label>
                          <Input
                            type="text"
                            value={group.label}
                            onChange={(e) => updateGroupLabel(index, e.target.value)}
                            className="toolbox-input"
                            placeholder="输入组别名称"
                          />
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs">流量比例 (%)</Label>
                          <Input
                            type="number"
                            value={group.proportion}
                            onChange={(e) => updateGroupProportion(index, e.target.value)}
                            className="toolbox-input"
                            min="0"
                            max="100"
                          />
                        </div>
                        {formData.groups.length > 2 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeGroup(index)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M18 6 6 18"/><path d="M6 6 18 18"/></svg>
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button onClick={addGroup} variant="outline" size="sm" className="w-full">
                      + 添加实验组
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      比例总和: {formData.groups.reduce((sum, group) => sum + group.proportion, 0)}%
                      {formData.groups.reduce((sum, group) => sum + group.proportion, 0) !== 100 && (
                        <span className="text-red-500 ml-2">(必须等于100%)</span>
                      )}
                    </div>
                  </div>
                </div>

                {isProcessing && (
                  <div className="space-y-2">
                    <Label>进度</Label>
                    <Progress value={progress} className="w-full" />
                    <p className="text-sm text-muted-foreground text-center">
                      正在运行重随机算法... {progress.toFixed(1)}%
                    </p>
                  </div>
                )}

                <Button 
                  onClick={runRerandomization} 
                  disabled={isProcessing}
                  className="w-full toolbox-button"
                >
                  {isProcessing ? '运行中...' : '开始重随机'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* 结果展示 */}
        <Card className="toolbox-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>重随机结果</CardTitle>
                <CardDescription>最佳种子和T统计量分布</CardDescription>
              </div>
              {results && (
                <Button onClick={exportResults} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  导出
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {results ? (
              <div className="space-y-6">
                {/* 最佳种子 */}
                <div className="text-center p-6 bg-primary/10 rounded-lg border border-primary/20">
                  <Target className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-primary mb-2">最佳随机种子</h3>
                  <p className="text-2xl font-mono font-bold text-foreground">{results.bestSeed}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    最大T统计量: {results.bestScore.toFixed(4)}
                  </p>
                </div>

                {/* 前三名候选种子 */}
                <div className="space-y-2">
                  <h4 className="font-medium">前三名候选种子</h4>
                  {results.topSeeds.map((seed, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-secondary rounded">
                      <div>
                        <span className="font-medium">#{index + 1}</span>
                        <span className="ml-3 font-mono">{seed.seed}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        T统计量: {seed.maxTStat.toFixed(4)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* T统计量分布直方图 */}
                <div className="space-y-2">
                  <h4 className="font-medium">T统计量分布</h4>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={results.histogram}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="bin" />
                        <YAxis />
                        <Bar 
                          dataKey="count" 
                          fill="#6495ED"
                        />
                        {results.bestScore && (
                          <ReferenceLine 
                            x={results.bestScore.toFixed(2)} 
                            stroke="#FF6B6B" 
                            strokeDasharray="5 5"
                            label="最佳种子"
                          />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    红色虚线标记了最佳种子对应的T统计量区间。
                  </p>
                </div>

                {/* 最佳种子调平指标检验结果 */}
                {results.bestSeedResults && (
                  <div className="space-y-2">
                    <h4 className="font-medium">最佳种子调平指标检验结果</h4>
                    <div className="space-y-4">
                      {Object.entries(results.bestSeedResults).map(([metric, metricResults]) => (
                        <div key={metric} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-medium text-primary">{metric}</h5>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {metricTypeConfigs[metricResults.metric_type]?.label || metricResults.metric_type}
                              </span>
                              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                                {metricTypeConfigs[metricResults.metric_type]?.testMethod || '未知检验'}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {metricResults.tests.map((test, index) => (
                              <div key={index} className="bg-secondary p-3 rounded">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <span className="font-medium">{test.group1} vs {test.group2}</span>
                                    <span className="text-sm text-muted-foreground ml-2">({test.test_type})</span>
                                  </div>
                                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                                    test.significant 
                                      ? 'bg-red-100 text-red-800' 
                                      : 'bg-green-100 text-green-800'
                                  }`}>
                                    {test.significant ? '显著差异' : '无显著差异'}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">统计量:</span>
                                    <span className="ml-2 font-mono">
                                      {test.statistic !== null ? test.statistic.toFixed(4) : 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">P值:</span>
                                    <span className="ml-2 font-mono">
                                      {test.p_value !== null ? test.p_value.toFixed(6) : 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">{test.group1}均值:</span>
                                    <span className="ml-2 font-mono">
                                      {test.group1_mean !== null ? test.group1_mean.toFixed(4) : 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">{test.group2}均值:</span>
                                    <span className="ml-2 font-mono">
                                      {test.group2_mean !== null ? test.group2_mean.toFixed(4) : 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">{test.group1}样本量:</span>
                                    <span className="ml-2">{test.group1_size}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">{test.group2}样本量:</span>
                                    <span className="ml-2">{test.group2_size}</span>
                                  </div>
                                </div>
                                {test.error && (
                                  <div className="text-red-500 text-xs mt-2">
                                    错误: {test.error}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Shuffle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>上传数据并运行重随机后，结果将在此处显示</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Rerandomization


