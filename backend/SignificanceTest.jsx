import { useState, useRef } from 'react'
import { BarChart3, Upload, Download, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Checkbox } from '@/components/ui/checkbox.jsx'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ErrorBar } from 'recharts'
import { StatisticalTest } from '../lib/statistics'

const SignificanceTest = () => {
  const [uploadedData, setUploadedData] = useState(null)
  const [dataPreview, setDataPreview] = useState([])
  const [columns, setColumns] = useState([])
  const [formData, setFormData] = useState({
    groupColumn: '',
    userIdColumn: '',
    metricColumn: '',
    controlLabel: '',
    treatmentLabel: '',
    metricType: 'mean',
    multipleComparison: false,
    alpha: 0.05
  })
  const [results, setResults] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target.result
        const lines = text.split('\n').filter(line => line.trim())
        if (lines.length <= 1) {
          throw new Error('文件内容无效或为空。')
        }
        
        const headers = lines[0].split(',').map(h => h.trim())
        
        const preview = lines.slice(1, 6).map(line => {
          const values = line.split(',')
          const row = {}
          headers.forEach((header, index) => {
            row[header] = (values[index] || '').trim()
          })
          return row
        })

        setColumns(headers)
        setDataPreview(preview)
        setUploadedData(text)

        const smartMapping = smartColumnMapping(headers)
        setFormData(prev => ({
          ...prev,
          ...smartMapping
        }))

      } catch (err) {
        console.error('文件解析错误:', err)
        setError(`文件解析错误: ${err.message}`)
        resetState()
      }
    }
    reader.readAsText(file)
  }

  const smartColumnMapping = (headers) => {
    const mapping = {}
    
    const groupKeywords = ['group', 'test', 'control', 'exp', 'treatment', '分组', '组别']
    const groupCol = headers.find(h => 
      groupKeywords.some(keyword => h.toLowerCase().includes(keyword.toLowerCase()))
    )
    if (groupCol) mapping.groupColumn = groupCol

    const idKeywords = ['id', 'user', 'uuid', 'userid', '用户', '用户id']
    const idCol = headers.find(h => 
      idKeywords.some(keyword => h.toLowerCase().includes(keyword.toLowerCase()))
    )
    if (idCol) mapping.userIdColumn = idCol

    const metricCandidates = headers.filter(h => 
      !groupKeywords.some(keyword => h.toLowerCase().includes(keyword.toLowerCase())) &&
      !idKeywords.some(keyword => h.toLowerCase().includes(keyword.toLowerCase()))
    )
    if (metricCandidates.length > 0) mapping.metricColumn = metricCandidates[0]

    return mapping
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const runSignificanceTest = async () => {
    if (!uploadedData || !formData.groupColumn || !formData.metricColumn || !formData.controlLabel || !formData.treatmentLabel) {
      setError('请确保已上传数据并选择了所有必要的列和标签。')
      return
    }

    setIsProcessing(true)
    setError(null)
    setResults([])
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const lines = uploadedData.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim())
      const data = lines.slice(1).map(line => {
        const values = line.split(',')
        const row = {}
        headers.forEach((header, index) => {
          row[header] = (values[index] || '').trim()
        })
        return row
      }).filter(row => row[formData.groupColumn] && row[formData.metricColumn])

      const controlData = data.filter(row => row[formData.groupColumn] === formData.controlLabel)
      const treatmentData = data.filter(row => row[formData.groupColumn] === formData.treatmentLabel)

      if (controlData.length === 0 || treatmentData.length === 0) {
        throw new Error('对照组或实验组数据为空，请检查标签是否正确。')
      }

      const statisticalTest = new StatisticalTest(parseFloat(formData.alpha))
      
      const controlValues = controlData.map(row => parseFloat(row[formData.metricColumn])).filter(v => !isNaN(v))
      const treatmentValues = treatmentData.map(row => parseFloat(row[formData.metricColumn])).filter(v => !isNaN(v))

      if (controlValues.length < 2 || treatmentValues.length < 2) {
        throw new Error('分组数据量过少，无法进行统计检验。')
      }

      let testResult
      if (formData.metricType === 'mean') {
        testResult = statisticalTest.testMean(controlValues, treatmentValues)
      } else if (formData.metricType === 'proportion') {
        testResult = statisticalTest.testProportion(controlValues, treatmentValues)
      } else {
        throw new Error('未知的指标类型。')
      }

      setResults([{
        metric: formData.metricColumn,
        control_mean: testResult.controlMean,
        treatment_mean: testResult.treatmentMean,
        difference: testResult.difference,
        relative_difference: testResult.relativeDifference,
        t_statistic: testResult.tStatistic,
        p_value: testResult.pValue,
        significance: testResult.significance,
        confidence_interval: testResult.confidenceInterval
      }])

    } catch (err) {
      console.error('统计检验错误:', err)
      setError(`统计检验过程中出现错误: ${err.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const exportResults = () => {
    const csvContent = [
      ['指标', '对照组均值', '实验组均值', '差异', '相对差异', 'T统计量', 'P值', '显著性', '置信区间下限', '置信区间上限'],
      ...results.map(r => [
        r.metric, 
        r.control_mean.toFixed(4), 
        r.treatment_mean.toFixed(4), 
        r.difference.toFixed(4), 
        (r.relative_difference * 100).toFixed(2) + '%',
        r.t_statistic.toFixed(4),
        r.p_value.toFixed(4),
        r.significance,
        r.confidence_interval[0].toFixed(4),
        r.confidence_interval[1].toFixed(4)
      ])
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'significance_test_results.csv'
    link.click()
  }

  const resetState = () => {
    setUploadedData(null)
    setDataPreview([])
    setColumns([])
    setFormData({
      groupColumn: '',
      userIdColumn: '',
      metricColumn: '',
      controlLabel: '',
      treatmentLabel: '',
      metricType: 'mean',
      multipleComparison: false,
      alpha: 0.05
    })
    setResults([])
    fileInputRef.current.value = ''
  }

  const chartData = results.map(result => ({
    name: '对照组',
    value: result.control_mean,
    error: 0
  })).concat(results.map(result => ({
    name: '实验组',
    value: result.treatment_mean,
    error: Math.abs(result.confidence_interval[1] - result.confidence_interval[0]) / 2
  })))

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <BarChart3 className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">显著性检验</h2>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="toolbox-card">
          <CardHeader>
            <CardTitle>数据上传与配置</CardTitle>
            <CardDescription>上传CSV文件并配置检验参数</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>数据文件</Label>
              <div 
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors relative"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  点击上传CSV文件或拖拽文件到此处
                </p>
                {uploadedData && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation()
                      resetState()
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

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

            {columns.length > 0 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>分组列</Label>
                    <Select value={formData.groupColumn} onValueChange={(value) => handleInputChange('groupColumn', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择分组列" />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                </div>

                <div className="space-y-2">
                  <Label>指标列</Label>
                  <Select value={formData.metricColumn} onValueChange={(value) => handleInputChange('metricColumn', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择指标列" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>对照组标签</Label>
                    <Input
                      value={formData.controlLabel}
                      onChange={(e) => handleInputChange('controlLabel', e.target.value)}
                      placeholder="如: control"
                      className="toolbox-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>实验组标签</Label>
                    <Input
                      value={formData.treatmentLabel}
                      onChange={(e) => handleInputChange('treatmentLabel', e.target.value)}
                      placeholder="如: treatment"
                      className="toolbox-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>指标类型</Label>
                    <Select value={formData.metricType} onValueChange={(value) => handleInputChange('metricType', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mean">均值</SelectItem>
                        <SelectItem value="proportion">比例</SelectItem>
                        <SelectItem value="ratio">比率</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>显著性水平</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.alpha}
                      onChange={(e) => handleInputChange('alpha', e.target.value)}
                      className="toolbox-input"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="multipleComparison"
                    checked={formData.multipleComparison}
                    onCheckedChange={(checked) => handleInputChange('multipleComparison', checked)}
                  />
                  <Label htmlFor="multipleComparison">多重比较校正</Label>
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}
                
                <Button 
                  onClick={runSignificanceTest} 
                  disabled={isProcessing}
                  className="w-full toolbox-button"
                >
                  {isProcessing ? '检验中...' : '运行显著性检验'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="toolbox-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>检验结果</CardTitle>
                <CardDescription>统计检验结果和可视化</CardDescription>
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
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Bar dataKey="value" fill="#6495ED">
                        <ErrorBar dataKey="error" width={4} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2">
                  {results.map((result, index) => (
                    <div key={index} className="p-4 bg-secondary rounded-lg">
                      <h4 className="font-medium mb-2">指标: {result.metric}</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">对照组均值:</span>
                          <span className="ml-2 font-medium">{result.control_mean.toFixed(4)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">实验组均值:</span>
                          <span className="ml-2 font-medium">{result.treatment_mean.toFixed(4)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">绝对差异:</span>
                          <span className="ml-2 font-medium">{result.difference.toFixed(4)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">相对差异:</span>
                          <span className="ml-2 font-medium">{(result.relative_difference * 100).toFixed(2)}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">T统计量:</span>
                          <span className="ml-2 font-medium">{result.t_statistic.toFixed(4)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">P值:</span>
                          <span className="ml-2 font-medium">{result.p_value.toFixed(4)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">显著性:</span>
                          <span className={`ml-2 font-medium ${result.significance === '显著' ? 'text-green-600' : 'text-red-600'}`}>
                            {result.significance}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">95%置信区间:</span>
                          <span className="ml-2 font-medium">
                            [{result.confidence_interval[0].toFixed(4)}, {result.confidence_interval[1].toFixed(4)}]
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>上传数据文件并配置参数后开始检验</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SignificanceTest