import { useState } from 'react'
import { Calculator, Info, Download } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.jsx'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { SampleSizeCalculator as SampleCalculator } from '../lib/statistics'

const SampleSizeCalculator = () => {
  const [formData, setFormData] = useState({
    metricType: 'proportion',
    baselineValue: 0.1,
    variance: 0.09,
    mdeStart: 0.01,
    mdeEnd: 0.1,
    mdeStep: 0.01,
    kValue: 1,
    groupNum: 2, // 新增：实验组数量
    dailyTraffic: 100000,
    experimentRatio: 0.5,
    alpha: 0.05,
    power: 0.8
  })

  const [results, setResults] = useState([])
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState(null)

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const validateInput = () => {
    const { baselineValue, variance, dailyTraffic, experimentRatio, mdeStart, mdeEnd, mdeStep, alpha, power, groupNum } = formData
    
    if (parseFloat(baselineValue) <= 0) return '基准值必须是正数。'
    if (formData.metricType === 'proportion' && (parseFloat(baselineValue) >= 1)) return '比例型指标的基准值必须小于1。'
    if (formData.metricType === 'mean' && parseFloat(variance) <= 0) return '均值型指标的方差必须是正数。'
    if (parseInt(dailyTraffic) <= 0) return '日活流量必须是正数。'
    if (parseFloat(experimentRatio) <= 0 || parseFloat(experimentRatio) > 1) return '实验流量比例必须在 (0, 1] 之间。'
    if (parseFloat(mdeStart) <= 0 || parseFloat(mdeEnd) <= 0 || parseFloat(mdeStep) <= 0) return 'MDE参数必须是正数。'
    if (parseFloat(mdeEnd) < parseFloat(mdeStart)) return 'MDE结束值必须大于或等于开始值。'
    if (parseFloat(alpha) <= 0 || parseFloat(alpha) >= 1) return '显著性水平必须在 (0, 1) 之间。'
    if (parseFloat(power) <= 0 || parseFloat(power) >= 1) return '统计功效必须在 (0, 1) 之间。'
    if (parseInt(groupNum) < 2) return '实验组数量必须至少为2（1个对照组+1个实验组）。'
    
    return null
  }

  const calculateSampleSize = async () => {
    const validationError = validateInput()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsCalculating(true)
    setError(null)
    setResults([])
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const calculator = new SampleCalculator(
        parseFloat(formData.alpha),
        parseFloat(formData.power)
      )
      
      const newResults = calculator.calculateExperimentRequirements({
        metricType: formData.metricType,
        baselineValue: parseFloat(formData.baselineValue),
        variance: parseFloat(formData.variance),
        mdeRange: [parseFloat(formData.mdeStart), parseFloat(formData.mdeEnd), parseFloat(formData.mdeStep)],
        dailyTraffic: parseInt(formData.dailyTraffic),
        sampleRatio: parseFloat(formData.experimentRatio),
        k: parseFloat(formData.kValue),
        groupNum: parseInt(formData.groupNum)
      });

      setResults(newResults)
      
    } catch (err) {
      console.error('计算错误:', err)
      setError(`计算过程中出现错误: ${err.message}`)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Calculator className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">样本量计算器</h2>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="toolbox-card">
          <CardHeader>
            <CardTitle>参数设置</CardTitle>
            <CardDescription>配置实验参数以计算所需样本量</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TooltipProvider>
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
                  <Label htmlFor="baselineValue">基准值</Label>
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
                />
              </div>

              {formData.metricType === 'mean' && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="variance">方差</Label>
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
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="mdeStart">MDE开始值</Label>
                  <Input
                    id="mdeStart"
                    type="number"
                    step="0.001"
                    value={formData.mdeStart}
                    onChange={(e) => handleInputChange('mdeStart', e.target.value)}
                    className="toolbox-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mdeEnd">MDE结束值</Label>
                  <Input
                    id="mdeEnd"
                    type="number"
                    step="0.001"
                    value={formData.mdeEnd}
                    onChange={(e) => handleInputChange('mdeEnd', e.target.value)}
                    className="toolbox-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mdeStep">MDE步长</Label>
                  <Input
                    id="mdeStep"
                    type="number"
                    step="0.001"
                    value={formData.mdeStep}
                    onChange={(e) => handleInputChange('mdeStep', e.target.value)}
                    className="toolbox-input"
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
                    value={formData.alpha}
                    onChange={(e) => handleInputChange('alpha', e.target.value)}
                    className="toolbox-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="power">统计功效</Label>
                  <Input
                    id="power"
                    type="number"
                    step="0.01"
                    value={formData.power}
                    onChange={(e) => handleInputChange('power', e.target.value)}
                    className="toolbox-input"
                  />
                </div>
              </div>
            </TooltipProvider>
            
            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

            <Button 
              onClick={calculateSampleSize} 
              disabled={isCalculating}
              className="w-full toolbox-button"
            >
              {isCalculating ? '计算中...' : '计算样本量'}
            </Button>
          </CardContent>
        </Card>

        <Card className="toolbox-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>计算结果</CardTitle>
                <CardDescription>样本量计算结果和可视化</CardDescription>
              </div>
              {results.length > 0 && (
                <Button onClick={exportResults} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  导出
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {results.length > 0 ? (
              <div className="space-y-4">
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mde" />
                      <YAxis />
                      <Line 
                        type="monotone" 
                        dataKey="totalSampleSize" 
                        stroke="#6495ED" 
                        strokeWidth={2}
                        dot={{ fill: '#6495ED' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  <div className="mb-2 text-sm text-muted-foreground">
                    实验组数量: {formData.groupNum} (1个对照组 + {parseInt(formData.groupNum) - 1}个实验组)
                  </div>
                  <table className="result-table">
                    <thead>
                      <tr>
                        <th>MDE</th>
                        <th>对照组样本量</th>
                        <th>每组实验组样本量</th>
                        <th>总样本量</th>
                        <th>实验天数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((result, index) => (
                        <tr key={index}>
                          <td>{result.mde}</td>
                          <td>{result.control_sample_size.toLocaleString()}</td>
                          <td>{result.treatment_sample_size.toLocaleString()}</td>
                          <td>{result.total_sample_size.toLocaleString()}</td>
                          <td>{result.experiment_days}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                点击"计算样本量"按钮开始计算
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SampleSizeCalculator