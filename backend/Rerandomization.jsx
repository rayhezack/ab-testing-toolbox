import { useState, useRef } from 'react'
import { Shuffle, Upload, Download, FileText, Target, X } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Rerandomization as RerandomizationAlgorithm } from '../lib/statistics'

const Rerandomization = () => {
  const [uploadedData, setUploadedData] = useState(null)
  const [dataPreview, setDataPreview] = useState([])
  const [columns, setColumns] = useState([])
  const [formData, setFormData] = useState({
    groupColumn: '',
    userIdColumn: '',
    metricColumns: [],
    iterations: 1000,
    groupProportions: { control: 50, treatment: 50 }
  })
  const [results, setResults] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
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

    const metricCols = headers.filter(h => 
      !groupKeywords.some(keyword => h.toLowerCase().includes(keyword.toLowerCase())) &&
      !idKeywords.some(keyword => h.toLowerCase().includes(keyword.toLowerCase()))
    )
    if (metricCols.length > 0) mapping.metricColumns = metricCols.slice(0, 3)

    return mapping
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleMetricColumnChange = (value) => {
    const selectedColumns = Array.isArray(value) ? value : [value]
    setFormData(prev => ({
      ...prev,
      metricColumns: selectedColumns
    }))
  }

  const handleGroupProportionChange = (group, value) => {
    const numValue = Math.min(100, Math.max(0, parseInt(value) || 0))
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

  const runRerandomization = async () => {
    if (!uploadedData || !formData.userIdColumn || formData.metricColumns.length === 0) {
      setError('请确保已上传数据并选择了用户ID列和至少一个指标列。')
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setError(null)
    setResults(null)
    
    try {
      const lines = uploadedData.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim())
      const data = lines.slice(1).map(line => {
        const values = line.split(',')
        const row = {}
        headers.forEach((header, index) => {
          row[header] = (values[index] || '').trim()
        })
        return row
      }).filter(row => row[formData.userIdColumn])

      const bestSeedResult = await RerandomizationAlgorithm.generateBestSeed(
        data,
        formData.metricColumns,
        formData.userIdColumn,
        parseInt(formData.iterations) || 1000,
        formData.groupProportions,
        (progressValue) => setProgress(progressValue)
      )

      if (!bestSeedResult || !bestSeedResult.bestSeed) {
        throw new Error('未找到最佳随机种子，请检查数据或参数设置。')
      }

      const histogramData = generateHistogramData(bestSeedResult.allTStats, bestSeedResult.bestScore)

      setResults({
        ...bestSeedResult,
        histogram: histogramData,
        totalIterations: formData.iterations
      })

    } catch (err) {
      console.error('重随机错误:', err)
      setError(`重随机过程中出现错误: ${err.message}`)
    } finally {
      setIsProcessing(false)
      setProgress(0)
    }
  }

  const generateHistogramData = (allTStats, bestScore) => {
    if (allTStats.length === 0) return []
    
    const bins = 20
    const min = Math.min(...allTStats)
    const max = Math.max(...allTStats)
    if (min === max) return [{ bin: min.toFixed(2), count: allTStats.length, isBest: true }]
    
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
    
    const bestBinIndex = Math.min(Math.floor((bestScore - min) / binWidth), bins - 1)
    if (bestBinIndex >= 0) {
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

  const resetState = () => {
    setUploadedData(null)
    setDataPreview([])
    setColumns([])
    setFormData({
      groupColumn: '',
      userIdColumn: '',
      metricColumns: [],
      iterations: 1000,
      groupProportions: { control: 50, treatment: 50 }
    })
    setResults(null)
    fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Shuffle className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">重随机 (SeedFinder)</h2>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="toolbox-card">
          <CardHeader>
            <CardTitle>数据上传与配置</CardTitle>
            <CardDescription>上传数据并配置重随机参数</CardDescription>
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

                <div className="space-y-2">
                  <Label>指标列 (可多选)</Label>
                  <div className="space-y-2">
                    {columns.filter(col => col !== formData.userIdColumn && col !== formData.groupColumn).map(col => (
                      <div key={col} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={col}
                          checked={formData.metricColumns.includes(col)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleMetricColumnChange([...formData.metricColumns, col])
                            } else {
                              handleMetricColumnChange(formData.metricColumns.filter(c => c !== col))
                            }
                          }}
                          className="rounded"
                        />
                        <Label htmlFor={col} className="text-sm">{col}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>迭代次数</Label>
                  <Input
                    type="number"
                    value={formData.iterations}
                    onChange={(e) => handleInputChange('iterations', e.target.value)}
                    className="toolbox-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label>分组比例</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">对照组 (%)</Label>
                      <Input
                        type="number"
                        value={formData.groupProportions.control}
                        onChange={(e) => handleGroupProportionChange('control', e.target.value)}
                        className="toolbox-input"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">实验组 (%)</Label>
                      <Input
                        type="number"
                        value={formData.groupProportions.treatment}
                        onChange={(e) => handleGroupProportionChange('treatment', e.target.value)}
                        className="toolbox-input"
                      />
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
                
                {error && <p className="text-red-500 text-sm">{error}</p>}

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
                <div className="text-center p-6 bg-primary/10 rounded-lg border border-primary/20">
                  <Target className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-primary mb-2">最佳随机种子</h3>
                  <p className="text-2xl font-mono font-bold text-foreground">{results.bestSeed}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    最大T统计量: {results.bestScore.toFixed(4)}
                  </p>
                </div>

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
                          stroke={(entry) => entry.isBest ? "#FF6B6B" : "#6495ED"}
                          strokeWidth={(entry) => entry.isBest ? 2 : 0}
                        />
                        <ReferenceLine 
                          x={results.bestScore.toFixed(2)} 
                          stroke="#FF6B6B" 
                          strokeDasharray="5 5"
                          label="最佳种子"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    红色虚线标记最佳种子位置，共运行 {results.totalIterations} 次迭代
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>上传数据文件并配置参数后开始重随机</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Rerandomization