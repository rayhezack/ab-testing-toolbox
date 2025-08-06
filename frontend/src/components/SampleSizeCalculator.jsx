import { useState } from 'react'
import { Calculator, Info, Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.jsx'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'

const SampleSizeCalculator = () => {
  const [formData, setFormData] = useState({
    metricType: 'mean',
    baselineValue: '',
    variance: '',
    mdeStart: '',
    mdeEnd: '',
    mdeStep: '',
    kValue: 1,
    groupNum: 2, // 新增：实验组数量
    dailyTraffic: 10000,
    experimentRatio: 0.5,
    alpha: 0.05,
    power: 0.8
  })

  const [results, setResults] = useState([])
  const [isCalculating, setIsCalculating] = useState(false)
  const [uploadedData, setUploadedData] = useState(null)
  const [selectedMetric, setSelectedMetric] = useState('')
  const [calculatedStats, setCalculatedStats] = useState(null)

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target.result
          const lines = text.split('\n').filter(line => line.trim())
          const headers = lines[0].split(',').map(h => h.trim())
          
          const data = lines.slice(1).map(line => {
            const values = line.split(',')
            const row = {}
            headers.forEach((header, index) => {
              row[header] = values[index]?.trim()
            })
            return row
          })
          
          setUploadedData(data)
          
          // 自动选择第一个数值列作为默认指标（排除ID列）
          const numericColumns = headers.filter(header => {
            const sampleValue = data[0]?.[header]
            const isNumeric = !isNaN(parseFloat(sampleValue))
            const isNotId = !header.toLowerCase().includes('id') && 
                           !header.toLowerCase().includes('user') && 
                           !header.toLowerCase().includes('uuid')
            return isNumeric && isNotId
          })
          
          if (numericColumns.length > 0) {
            setSelectedMetric(numericColumns[0])
            calculateStatsFromData(data, numericColumns[0])
          }
          
        } catch (error) {
          console.error('文件解析错误:', error)
          alert('文件格式错误，请上传有效的CSV文件')
        }
      }
      reader.readAsText(file)
    }
  }

  const calculateStatsFromData = (data, metric) => {
    if (!data || !metric) return
    
    // 确保基于所选指标列计算，而不是unit_id
    const values = data.map(row => parseFloat(row[metric])).filter(v => !isNaN(v) && isFinite(v))
    
    if (values.length === 0) {
      alert('所选指标列没有有效的数值数据')
      return
    }
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2))
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1)
    
    const stats = {
      baseline: mean,
      variance: variance,
      sampleSize: values.length
    }
    
    setCalculatedStats(stats)
    
    // 自动更新表单数据
    setFormData(prev => ({
      ...prev,
      baselineValue: mean.toString(),
      variance: variance.toString()
    }))
  }

  const handleMetricChange = (metric) => {
    setSelectedMetric(metric)
    if (uploadedData) {
      calculateStatsFromData(uploadedData, metric)
    }
  }

  const validateInputs = () => {
    const mdeStart = parseFloat(formData.mdeStart)
    const mdeEnd = parseFloat(formData.mdeEnd)
    const mdeStep = parseFloat(formData.mdeStep)
    const baselineValue = parseFloat(formData.baselineValue)
    const variance = parseFloat(formData.variance)
    const alpha = parseFloat(formData.alpha)
    const power = parseFloat(formData.power)
    const kValue = parseFloat(formData.kValue)
    const groupNum = parseInt(formData.groupNum) // 新增：实验组数量
    const dailyTraffic = parseInt(formData.dailyTraffic)
    const experimentRatio = parseFloat(formData.experimentRatio)

    // 检查是否有NaN值
    if (isNaN(mdeStart) || isNaN(mdeEnd) || isNaN(mdeStep) || 
        isNaN(baselineValue) || isNaN(alpha) || isNaN(power) || 
        isNaN(kValue) || isNaN(groupNum) || isNaN(dailyTraffic) || isNaN(experimentRatio) ||
        (formData.metricType === 'mean' && isNaN(variance))) {
      throw new Error('请确保所有必填字段都已正确填写，且为有效数字');
    }

    // 对于均值类型，检查方差
    if (formData.metricType === 'mean' && isNaN(variance)) {
      throw new Error('均值类型指标需要填写方差值')
    }

    // 检查范围合理性
    if (mdeStart >= mdeEnd) {
      throw new Error('MDE开始值必须小于结束值')
    }

    if (mdeStep <= 0) {
      throw new Error('MDE步长必须大于0')
    }

    if (baselineValue <= 0) {
      throw new Error('基准值必须大于0')
    }

    if (formData.metricType === 'mean' && variance <= 0) {
      throw new Error('方差必须大于0')
    }

    if (groupNum < 2) {
      throw new Error('实验组数量必须至少为2（1个对照组+1个实验组）')
    }

    return {
      mdeStart, mdeEnd, mdeStep, baselineValue, variance,
      alpha, power, kValue, groupNum, dailyTraffic, experimentRatio
    }
  }

  const calculateSampleSize = async () => {
    setIsCalculating(true)
    
    try {
      const validatedInputs = validateInputs()
      const {
        mdeStart, mdeEnd, mdeStep, baselineValue, variance,
        alpha, power, kValue, groupNum, dailyTraffic, experimentRatio
      } = validatedInputs

      const newResults = [];

      for (let mde = mdeStart; mde <= mdeEnd; mde += mdeStep) {
        const requestBody = {
          metric_name: formData.metricType === 'proportion' ? '比例指标' : '均值指标',
          metric_type: formData.metricType,
          baseline: baselineValue,
          variance: formData.metricType === 'mean' ? variance : baselineValue * (1 - baselineValue), // 比例类型使用p(1-p)
          mde: mde,
          daily_traffic: dailyTraffic,
          sample_ratio: experimentRatio,
          k: kValue,
          group_num: groupNum // 新增：实验组数量
        }

        const response = await fetch("http://localhost:8000/sample-size", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
        }

        const data = await response.json()
        const sampleSize = data.control_sample_size

        if (isNaN(sampleSize) || !isFinite(sampleSize)) {
          throw new Error('后端返回的样本量计算结果无效')
        }

        const treatmentSampleSize = Math.round(sampleSize * kValue)
        // 正确计算总样本量：对照组样本量 + 实验组数量 × 每组实验组样本量
        const totalSample = Math.round(sampleSize + treatmentSampleSize * (groupNum - 1))
        const experimentDays = Math.ceil(totalSample / (dailyTraffic * experimentRatio))

        newResults.push({
          metric_name: formData.metricType === 'proportion' ? '比例指标' : '均值指标',
          mde: parseFloat(mde.toFixed(6)),
          control_sample_size: Math.round(sampleSize),
          treatment_sample_size: treatmentSampleSize,
          total_sample_size: totalSample,
          experiment_days: experimentDays
        })
      }
      setResults(newResults)
      
    } catch (error) {
      console.error('计算错误:', error)
      alert(`计算过程中出现错误: ${error.message}`)
    } finally {
      setIsCalculating(false)
    }
  }

  const chartData = results.map(result => ({
    mde: result.mde,
    totalSampleSize: result.total_sample_size
  }))

  const exportResults = () => {
    const csvContent = [
      ['指标名称', 'MDE', '对照组样本量', '每组实验组样本量', '总样本量', '实验天数', '实验组数量'],
      ...results.map(r => [
        r.metric_name, 
        r.mde, 
        r.control_sample_size, 
        r.treatment_sample_size, 
        r.total_sample_size, 
        r.experiment_days,
        formData.groupNum
      ])
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'sample_size_results.csv'
    link.click()
  }

  const getAvailableMetrics = () => {
    if (!uploadedData || uploadedData.length === 0) return []
    
    const headers = Object.keys(uploadedData[0])
    return headers.filter(header => {
      const sampleValue = uploadedData[0]?.[header]
      const isNumeric = !isNaN(parseFloat(sampleValue))
      const isNotId = !header.toLowerCase().includes('id') && 
                     !header.toLowerCase().includes('user') && 
                     !header.toLowerCase().includes('uuid')
      return isNumeric && isNotId
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Calculator className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">样本量计算器</h2>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 输入表单 */}
        <Card className="toolbox-card">
          <CardHeader>
            <CardTitle>参数设置</CardTitle>
            <CardDescription>配置实验参数以计算所需样本量</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TooltipProvider>
              {/* 数据上传区域 */}
              <div className="space-y-2">
                <Label htmlFor="dataFile">数据文件 (可选)</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-2">上传CSV文件自动计算基准值和方差</p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="dataFile"
                  />
                  <Button variant="outline" onClick={() => document.getElementById('dataFile').click()}>
                    选择文件
                  </Button>
                </div>
              </div>

              {/* 数据预览 */}
              {uploadedData && (
                <div className="space-y-2">
                  <Label>数据预览</Label>
                  <div className="border rounded-lg p-3 bg-gray-50 max-h-32 overflow-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr>
                          {Object.keys(uploadedData[0] || {}).map(header => (
                            <th key={header} className="text-left p-1 border-b">{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {uploadedData.slice(0, 3).map((row, index) => (
                          <tr key={index}>
                            {Object.values(row).map((value, i) => (
                              <td key={i} className="p-1">{value}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 指标选择 */}
              {uploadedData && getAvailableMetrics().length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="metricSelect">选择指标</Label>
                  <Select value={selectedMetric} onValueChange={handleMetricChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择要分析的指标" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableMetrics().map(metric => (
                        <SelectItem key={metric} value={metric}>{metric}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 计算出的统计信息 */}
              {calculatedStats && (
                <div className="space-y-2">
                  <Label>计算出的统计信息</Label>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="bg-blue-50 p-2 rounded">
                      <div className="font-medium">基准值</div>
                      <div>{calculatedStats.baseline.toFixed(4)}</div>
                    </div>
                    <div className="bg-green-50 p-2 rounded">
                      <div className="font-medium">方差</div>
                      <div>{calculatedStats.variance.toFixed(4)}</div>
                    </div>
                    <div className="bg-purple-50 p-2 rounded">
                      <div className="font-medium">样本数</div>
                      <div>{calculatedStats.sampleSize}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="metricType">指标类型</Label>
                <Select value={formData.metricType} onValueChange={(value) => handleInputChange('metricType', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proportion">比例</SelectItem>
                    <SelectItem value="mean">均值</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="baselineValue">基准值 *</Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>对照组的预期指标值</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="baselineValue"
                  type="number"
                  step="0.001"
                  value={formData.baselineValue}
                  onChange={(e) => handleInputChange('baselineValue', e.target.value)}
                  className="toolbox-input"
                  placeholder="请输入基准值"
                />
              </div>

              {formData.metricType === 'mean' && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="variance">方差 *</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>指标的方差值</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="variance"
                    type="number"
                    step="0.001"
                    value={formData.variance}
                    onChange={(e) => handleInputChange('variance', e.target.value)}
                    className="toolbox-input"
                    placeholder="请输入方差值"
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="mdeStart">MDE开始值 *</Label>
                  <Input
                    id="mdeStart"
                    type="number"
                    step="0.001"
                    value={formData.mdeStart}
                    onChange={(e) => handleInputChange('mdeStart', e.target.value)}
                    className="toolbox-input"
                    placeholder="如: 0.001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mdeEnd">MDE结束值 *</Label>
                  <Input
                    id="mdeEnd"
                    type="number"
                    step="0.001"
                    value={formData.mdeEnd}
                    onChange={(e) => handleInputChange('mdeEnd', e.target.value)}
                    className="toolbox-input"
                    placeholder="如: 0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mdeStep">MDE步长 *</Label>
                  <Input
                    id="mdeStep"
                    type="number"
                    step="0.000001"
                    value={formData.mdeStep}
                    onChange={(e) => handleInputChange('mdeStep', e.target.value)}
                    className="toolbox-input"
                    placeholder="如: 0.001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="kValue">K值</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>实验组与对照组的流量比例</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="kValue"
                    type="number"
                    step="0.1"
                    value={formData.kValue}
                    onChange={(e) => handleInputChange('kValue', e.target.value)}
                    className="toolbox-input"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="groupNum">实验组数量</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>总组数（1个对照组 + N个实验组）</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="groupNum"
                    type="number"
                    min="2"
                    value={formData.groupNum}
                    onChange={(e) => handleInputChange('groupNum', e.target.value)}
                    className="toolbox-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dailyTraffic">日活流量</Label>
                  <Input
                    id="dailyTraffic"
                    type="number"
                    value={formData.dailyTraffic}
                    onChange={(e) => handleInputChange('dailyTraffic', e.target.value)}
                    className="toolbox-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experimentRatio">实验流量比例</Label>
                  <Input
                    id="experimentRatio"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.experimentRatio}
                    onChange={(e) => handleInputChange('experimentRatio', e.target.value)}
                    className="toolbox-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="alpha">显著性水平 (α)</Label>
                  <Input
                    id="alpha"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.alpha}
                    onChange={(e) => handleInputChange('alpha', e.target.value)}
                    className="toolbox-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="power">统计功效 (1-β)</Label>
                  <Input
                    id="power"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.power}
                    onChange={(e) => handleInputChange('power', e.target.value)}
                    className="toolbox-input"
                  />
                </div>
              </div>

              <Button 
                onClick={calculateSampleSize} 
                disabled={isCalculating}
                className="w-full toolbox-button"
              >
                {isCalculating ? '计算中...' : '计算样本量'}
              </Button>
            </TooltipProvider>
          </CardContent>
        </Card>

        {/* 结果展示 */}
        <Card className="toolbox-card">
          <CardHeader>
            <CardTitle>计算结果</CardTitle>
            <CardDescription>样本量计算结果和可视化</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.length > 0 ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>计算结果表</Label>
                      <div className="text-sm text-muted-foreground">
                        实验组数量: {formData.groupNum} (1个对照组 + {parseInt(formData.groupNum) - 1}个实验组)
                      </div>
                    </div>
                    <Button onClick={exportResults} variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      导出结果
                    </Button>
                  </div>
                  <div className="max-h-64 overflow-auto border border-border rounded">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-secondary">
                          <th className="px-2 py-1 text-left">MDE</th>
                          <th className="px-2 py-1 text-left">对照组</th>
                          <th className="px-2 py-1 text-left">每组实验组</th>
                          <th className="px-2 py-1 text-left">总样本</th>
                          <th className="px-2 py-1 text-left">实验天数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((result, index) => (
                          <tr key={index} className="border-t border-border">
                            <td className="px-2 py-1">{result.mde.toFixed(6)}</td>
                            <td className="px-2 py-1">{result.control_sample_size.toLocaleString()}</td>
                            <td className="px-2 py-1">{result.treatment_sample_size.toLocaleString()}</td>
                            <td className="px-2 py-1">{result.total_sample_size.toLocaleString()}</td>
                            <td className="px-2 py-1">{result.experiment_days}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {chartData.length > 1 && (
                  <div className="space-y-2">
                    <Label>样本量趋势图</Label>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="mde" 
                            tickFormatter={(value) => value.toFixed(3)}
                          />
                          <YAxis 
                            tickFormatter={(value) => value.toLocaleString()}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="totalSampleSize" 
                            stroke="#6495ED" 
                            strokeWidth={2}
                            dot={{ fill: '#6495ED', strokeWidth: 2, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>点击"计算样本量"按钮开始计算</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SampleSizeCalculator

