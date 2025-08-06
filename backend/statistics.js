/**
 * 统计计算库
 * 基于Python代码中的算法实现JavaScript版本
 */

// 数学常数和辅助函数
const SQRT_2PI = Math.sqrt(2 * Math.PI)
const SQRT_2 = Math.sqrt(2)

/**
 * 误差函数 (Error Function)
 * 用于正态分布计算
 */
export function erf(x) {
  // Abramowitz and Stegun approximation
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911

  const sign = x >= 0 ? 1 : -1
  x = Math.abs(x)

  const t = 1.0 / (1.0 + p * x)
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

  return sign * y
}

/**
 * 标准正态分布累积分布函数 (CDF)
 */
export function normalCDF(x) {
  return 0.5 * (1 + erf(x / SQRT_2))
}

/**
 * 标准正态分布概率密度函数 (PDF)
 */
export function normalPDF(x) {
  return Math.exp(-0.5 * x * x) / SQRT_2PI
}

/**
 * 标准正态分布分位数函数 (Inverse CDF)
 * 使用Beasley-Springer-Moro算法
 */
export function normalInverseCDF(p) {
  if (p <= 0 || p >= 1) {
    throw new Error('p must be between 0 and 1')
  }

  // 特殊值
  if (p === 0.5) return 0
  if (p > 0.5) return -normalInverseCDF(1 - p)

  // Beasley-Springer-Moro算法
  const a0 = 2.50662823884
  const a1 = -18.61500062529
  const a2 = 41.39119773534
  const a3 = -25.44106049637
  const b1 = -8.47351093090
  const b2 = 23.08336743743
  const b3 = -21.06224101826
  const b4 = 3.13082909833
  const c0 = -2.78718931138
  const c1 = -2.29796479134
  const c2 = 4.85014127135
  const c3 = 2.32121276858
  const d1 = 3.54388924762
  const d2 = 1.63706781897

  const t = Math.sqrt(-2 * Math.log(p))
  
  if (t < 5) {
    const numerator = a0 + a1 * t + a2 * t * t + a3 * t * t * t
    const denominator = 1 + b1 * t + b2 * t * t + b3 * t * t * t + b4 * t * t * t * t
    return t - numerator / denominator
  } else {
    const numerator = c0 + c1 * t + c2 * t * t + c3 * t * t * t
    const denominator = 1 + d1 * t + d2 * t * t
    return t - numerator / denominator
  }
}

/**
 * t分布累积分布函数 (CDF)
 * 使用不完全贝塔函数近似
 */
export function tCDF(t, df) {
  if (df <= 0) {
    throw new Error('Degrees of freedom must be positive')
  }
  
  // 对于大自由度，使用正态分布近似
  if (df > 100) {
    return normalCDF(t)
  }
  
  // 使用不完全贝塔函数的近似
  const x = df / (df + t * t)
  const a = df / 2
  const b = 0.5
  
  // 简化的不完全贝塔函数近似
  let result
  if (t >= 0) {
    result = 0.5 + 0.5 * incompleteBeta(x, a, b)
  } else {
    result = 0.5 - 0.5 * incompleteBeta(x, a, b)
  }
  
  return Math.max(0, Math.min(1, result))
}

/**
 * 不完全贝塔函数的近似计算
 */
function incompleteBeta(x, a, b) {
  if (x === 0) return 0
  if (x === 1) return 1
  
  // 使用连分数展开的近似
  const bt = Math.exp(gammaLn(a + b) - gammaLn(a) - gammaLn(b) + a * Math.log(x) + b * Math.log(1 - x))
  
  if (x < (a + 1) / (a + b + 2)) {
    return bt * betaCF(x, a, b) / a
  } else {
    return 1 - bt * betaCF(1 - x, b, a) / b
  }
}

/**
 * 贝塔函数连分数展开
 */
function betaCF(x, a, b) {
  const maxIterations = 100
  const epsilon = 3e-7
  
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - qab * x / qap
  
  if (Math.abs(d) < epsilon) d = epsilon
  d = 1 / d
  let h = d
  
  for (let m = 1; m <= maxIterations; m++) {
    const m2 = 2 * m
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < epsilon) d = epsilon
    c = 1 + aa / c
    if (Math.abs(c) < epsilon) c = epsilon
    d = 1 / d
    h *= d * c
    
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < epsilon) d = epsilon
    c = 1 + aa / c
    if (Math.abs(c) < epsilon) c = epsilon
    d = 1 / d
    const del = d * c
    h *= del
    
    if (Math.abs(del - 1) < epsilon) break
  }
  
  return h
}

/**
 * 对数伽马函数
 */
function gammaLn(x) {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5
  ]
  
  let j = 0
  let ser = 1.000000000190015
  let xx = x
  let y = x
  let tmp = x + 5.5
  tmp -= (x + 0.5) * Math.log(tmp)
  
  for (; j < 6; j++) {
    ser += cof[j] / ++y
  }
  
  return -tmp + Math.log(2.5066282746310005 * ser / xx)
}

/**
 * t分布分位数函数 (Inverse CDF)
 */
export function tInverseCDF(p, df) {
  if (p <= 0 || p >= 1) {
    throw new Error('p must be between 0 and 1')
  }
  
  // 对于大自由度，使用正态分布近似
  if (df > 100) {
    return normalInverseCDF(p)
  }
  
  // 使用牛顿-拉夫逊方法求解
  let x = normalInverseCDF(p) // 初始猜测
  
  for (let i = 0; i < 10; i++) {
    const fx = tCDF(x, df) - p
    const fpx = tPDF(x, df)
    
    if (Math.abs(fx) < 1e-10) break
    
    x = x - fx / fpx
  }
  
  return x
}

/**
 * t分布概率密度函数 (PDF)
 */
export function tPDF(t, df) {
  const numerator = Math.exp(gammaLn((df + 1) / 2))
  const denominator = Math.sqrt(df * Math.PI) * Math.exp(gammaLn(df / 2))
  return numerator / denominator * Math.pow(1 + t * t / df, -(df + 1) / 2)
}

/**
 * 样本量计算器类
 */
export class SampleSizeCalculator {
  constructor(significanceLevel = 0.05, power = 0.8) {
    this.significanceLevel = significanceLevel
    this.power = power
    this.zBeta = normalInverseCDF(power)
  }

  /**
   * 获取临界Z值
   */
  getCriticalValue(isTwoSided = true) {
    if (isTwoSided) {
      return normalInverseCDF(1 - this.significanceLevel / 2)
    }
    return normalInverseCDF(1 - this.significanceLevel)
  }

  /**
   * 计算二项分布指标的样本量
   */
  calculateBinaryMetricSampleSize(baselineRate, mde, k = 1, isTwoSided = true) {
    const zAlpha = this.getCriticalValue(isTwoSided)
    const variance = baselineRate * (1 - baselineRate)
    const delta = baselineRate * mde
    
    const n = (1/k * (baselineRate + delta) * (1 - baselineRate - delta) + variance) * 
              Math.pow(zAlpha + this.zBeta, 2) / Math.pow(delta, 2)
    
    return Math.ceil(n)
  }

  /**
   * 计算连续分布指标的样本量
   */
  calculateContinuousMetricSampleSize(baseline, variance, mde, k = 1, isTwoSided = true) {
    const zAlpha = this.getCriticalValue(isTwoSided)
    const effectSize = mde * baseline
    
    const sampleSize = ((1 + 1/k) * Math.pow(zAlpha + this.zBeta, 2) * variance) / 
                       Math.pow(effectSize, 2)
    
    return Math.ceil(sampleSize)
  }

  /**
   * 计算实验需求
   */
  calculateExperimentRequirements(params) {
    const {
      metricType,
      baselineValue,
      variance,
      mdeRange,
      dailyTraffic,
      sampleRatio,
      k = 1,
      groupNum = 2,
      data = null,
      metric = null
    } = params

    const results = []
    const [start, end, step] = mdeRange

    // 如果有数据，从数据中计算基准值和方差
    let actualBaseline = baselineValue
    let actualVariance = variance
    
    if (data && metric && metricType === 'mean') {
      const values = data.map(row => parseFloat(row[metric])).filter(v => !isNaN(v))
      if (values.length > 0) {
        actualBaseline = values.reduce((a, b) => a + b, 0) / values.length
        const mean = actualBaseline
        const squaredDiffs = values.map(value => Math.pow(value - mean, 2))
        actualVariance = squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1)
      }
    } else if (data && metric && metricType === 'proportion') {
      const values = data.map(row => parseFloat(row[metric]) > 0 ? 1 : 0).filter(v => !isNaN(v))
      if (values.length > 0) {
        actualBaseline = values.reduce((a, b) => a + b, 0) / values.length
      }
    }

    for (let mde = start; mde < end; mde += step) {
      let controlSample

      if (metricType === 'proportion') {
        controlSample = this.calculateBinaryMetricSampleSize(actualBaseline, mde, k)
      } else {
        controlSample = this.calculateContinuousMetricSampleSize(actualBaseline, actualVariance, mde, k)
      }

      const treatmentSample = Math.ceil(controlSample * k)
      const totalSample = controlSample + treatmentSample * (groupNum - 1)
      const experimentDays = Math.ceil(totalSample / (dailyTraffic * sampleRatio))

      results.push({
        metric_name: metricType === 'proportion' ? '比例指标' : '均值指标',
        mde: parseFloat(mde.toFixed(3)),
        control_sample_size: controlSample,
        treatment_sample_size: treatmentSample,
        total_sample_size: totalSample,
        experiment_days: experimentDays
      })
    }

    return results
  }
}

/**
 * 统计检验类
 */
export class StatisticalTest {
  constructor(alpha = 0.05) {
    this.alpha = alpha
  }

  /**
   * 计算方差
   */
  calculateVariance(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2))
    return squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1)
  }

  /**
   * 均值检验 (t-test)
   */
  testMean(controlValues, treatmentValues, isTwoSided = true) {
    const controlMean = controlValues.reduce((a, b) => a + b, 0) / controlValues.length
    const treatmentMean = treatmentValues.reduce((a, b) => a + b, 0) / treatmentValues.length
    
    const controlVar = this.calculateVariance(controlValues)
    const treatmentVar = this.calculateVariance(treatmentValues)
    const n1 = controlValues.length
    const n2 = treatmentValues.length
    
    // 标准误差
    const stdError = Math.sqrt(controlVar/n1 + treatmentVar/n2)
    
    // 差异
    const difference = treatmentMean - controlMean
    const relativeDifference = difference / controlMean
    
    // t统计量
    const tStatistic = difference / stdError
    
    // 自由度 (Welch-Satterthwaite)
    const df = Math.pow(controlVar/n1 + treatmentVar/n2, 2) / 
               (Math.pow(controlVar/n1, 2)/(n1-1) + Math.pow(treatmentVar/n2, 2)/(n2-1))
    
    // p值
    let pValue
    if (isTwoSided) {
      pValue = 2 * (1 - tCDF(Math.abs(tStatistic), df))
    } else {
      pValue = 1 - tCDF(Math.abs(tStatistic), df)
    }
    
    // 置信区间 - 修复计算逻辑
    let confidenceInterval
    if (isTwoSided) {
      const tValue = tInverseCDF(1 - this.alpha/2, df)
      const margin = tValue * stdError
      confidenceInterval = [difference - margin, difference + margin]
      
      // 确保置信区间顺序正确
      if (confidenceInterval[0] > confidenceInterval[1]) {
        confidenceInterval = [confidenceInterval[1], confidenceInterval[0]]
      }
    } else {
      const tValue = tInverseCDF(1 - this.alpha, df)
      const margin = tValue * stdError
      if (tStatistic > 0) {
        confidenceInterval = [difference - margin, Infinity]
      } else {
        confidenceInterval = [-Infinity, difference + margin]
      }
    }
    
    return {
      controlMean,
      treatmentMean,
      difference,
      relativeDifference,
      tStatistic,
      pValue,
      significance: pValue < this.alpha ? '显著' : '不显著',
      confidenceInterval
    }
  }

  /**
   * 比例检验 (z-test)
   */
  testProportion(controlValues, treatmentValues, isTwoSided = true) {
    const controlRate = controlValues.reduce((a, b) => a + b, 0) / controlValues.length
    const treatmentRate = treatmentValues.reduce((a, b) => a + b, 0) / treatmentValues.length
    
    const n1 = controlValues.length
    const n2 = treatmentValues.length
    
    // 标准误差
    const stdError = Math.sqrt(
      controlRate * (1 - controlRate) / n1 + 
      treatmentRate * (1 - treatmentRate) / n2
    )
    
    // 差异
    const difference = treatmentRate - controlRate
    const relativeDifference = difference / controlRate
    
    // z统计量
    const zStatistic = difference / stdError
    
    // p值
    let pValue
    if (isTwoSided) {
      pValue = 2 * (1 - normalCDF(Math.abs(zStatistic)))
    } else {
      pValue = 1 - normalCDF(Math.abs(zStatistic))
    }
    
    // 置信区间
    const zValue = normalInverseCDF(1 - this.alpha/2)
    const margin = zValue * stdError
    const confidenceInterval = [difference - margin, difference + margin]
    
    return {
      controlMean: controlRate,
      treatmentMean: treatmentRate,
      difference,
      relativeDifference,
      tStatistic: zStatistic,
      pValue,
      significance: pValue < this.alpha ? '显著' : '不显著',
      confidenceInterval
    }
  }

  /**
   * 比率检验 (Delta method)
   */
  testRatio(controlX, controlY, treatmentX, treatmentY, isTwoSided = true) {
    const controlRatio = controlX.reduce((a, b) => a + b, 0) / controlY.reduce((a, b) => a + b, 0)
    const treatmentRatio = treatmentX.reduce((a, b) => a + b, 0) / treatmentY.reduce((a, b) => a + b, 0)
    
    // 使用Delta方法计算方差
    const controlVar = this.getRatioVariance(controlX, controlY)
    const treatmentVar = this.getRatioVariance(treatmentX, treatmentY)
    
    const stdError = Math.sqrt(controlVar + treatmentVar)
    
    // 差异
    const difference = treatmentRatio - controlRatio
    const relativeDifference = difference / controlRatio
    
    // t统计量
    const tStatistic = difference / stdError
    
    // 自由度近似
    const n1 = controlX.length
    const n2 = treatmentX.length
    const df = (controlVar + treatmentVar) ** 2 / 
               ((controlVar ** 2) / (n1 - 1) + (treatmentVar ** 2) / (n2 - 1))
    
    // p值
    let pValue
    if (isTwoSided) {
      pValue = 2 * (1 - tCDF(Math.abs(tStatistic), df))
    } else {
      pValue = 1 - tCDF(Math.abs(tStatistic), df)
    }
    
    // 置信区间
    const tValue = tInverseCDF(1 - this.alpha/2, df)
    const margin = tValue * stdError
    const confidenceInterval = [difference - margin, difference + margin]
    
    return {
      controlMean: controlRatio,
      treatmentMean: treatmentRatio,
      difference,
      relativeDifference,
      tStatistic,
      pValue,
      significance: pValue < this.alpha ? '显著' : '不显著',
      confidenceInterval
    }
  }

  /**
   * 计算比率的方差 (Delta method)
   */
  getRatioVariance(x, y) {
    const xVar = this.calculateVariance(x) / x.length
    const yVar = this.calculateVariance(y) / y.length
    const xMean = x.reduce((a, b) => a + b, 0) / x.length
    const yMean = y.reduce((a, b) => a + b, 0) / y.length
    
    // 协方差计算
    const cov = this.calculateCovariance(x, y) / x.length
    
    return (1 / Math.pow(yMean, 2)) * xVar + 
           (Math.pow(xMean, 2) / Math.pow(yMean, 4)) * yVar - 
           (2 * xMean / Math.pow(yMean, 3)) * cov
  }

  /**
   * 计算协方差
   */
  calculateCovariance(x, y) {
    const xMean = x.reduce((a, b) => a + b, 0) / x.length
    const yMean = y.reduce((a, b) => a + b, 0) / y.length
    
    let sum = 0
    for (let i = 0; i < x.length; i++) {
      sum += (x[i] - xMean) * (y[i] - yMean)
    }
    
    return sum / (x.length - 1)
  }
}

/**
 * 重随机算法类
 */
export class Rerandomization {
  /**
   * Apollo分桶算法
   */
  static apolloBucket(experimentName, individualId) {
    // 简化的哈希函数，模拟SHA1的行为
    let hash = 0
    const str = String(individualId) + experimentName + 'exp_bucket'
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    
    return Math.abs(hash) % 100
  }

  /**
   * 分配分组
   */
  static assignGroups(experimentName, individualId, groupProportions) {
    const bucket = this.apolloBucket(experimentName, individualId)
    
    let startBucket = 0
    for (const [group, proportion] of Object.entries(groupProportions)) {
      const prop = typeof proportion === 'string' && proportion.endsWith('%') 
        ? parseInt(proportion.slice(0, -1)) 
        : parseInt(proportion)
      
      if (bucket >= startBucket && bucket < startBucket + prop) {
        return group
      }
      startBucket += prop
    }
    
    // 如果没有匹配，返回最后一个组
    return Object.keys(groupProportions)[Object.keys(groupProportions).length - 1]
  }

  /**
   * 生成最佳种子
   */
  static async generateBestSeed(data, metrics, userIdColumn, iterations, groupProportions, onProgress) {
    const seedScores = []
    const allTStats = []
    
    for (let i = 0; i < iterations; i++) {
      // 更新进度
      if (onProgress) {
        onProgress((i / iterations) * 100)
      }
      
      // 生成随机种子
      const randomSeed = 'rr' + Math.floor(Math.random() * 1000000)
      
      // 分配分组
      const groupedData = this.assignGroupsToData(data, randomSeed, userIdColumn, groupProportions)
      
      // 计算每个指标的T统计量
      const tStats = []
      for (const metric of metrics) {
        const controlValues = groupedData.control
          .map(row => parseFloat(row[metric]))
          .filter(v => !isNaN(v))
        const treatmentValues = groupedData.treatment
          .map(row => parseFloat(row[metric]))
          .filter(v => !isNaN(v))
        
        if (controlValues.length > 0 && treatmentValues.length > 0) {
          const tStat = this.calculateTStatistic(controlValues, treatmentValues)
          tStats.push(Math.abs(tStat))
        }
      }
      
      if (tStats.length > 0) {
        const maxTStat = Math.max(...tStats)
        seedScores.push({ seed: randomSeed, maxTStat })
        allTStats.push(maxTStat)
      }
      
      // 每100次迭代暂停一下，让UI更新
      if (i % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    }
    
    // 找到最佳种子
    seedScores.sort((a, b) => a.maxTStat - b.maxTStat)
    const bestSeeds = seedScores.slice(0, 3)
    
    return {
      bestSeed: bestSeeds[0].seed,
      bestScore: bestSeeds[0].maxTStat,
      topSeeds: bestSeeds,
      allTStats
    }
  }

  /**
   * 为数据分配分组
   */
  static assignGroupsToData(data, seed, userIdColumn, groupProportions) {
    const grouped = {}
    
    // 初始化分组
    for (const group of Object.keys(groupProportions)) {
      grouped[group] = []
    }
    
    for (const row of data) {
      const userId = row[userIdColumn]
      const group = this.assignGroups(seed, userId, groupProportions)
      if (grouped[group]) {
        grouped[group].push(row)
      }
    }
    
    return grouped
  }

  /**
   * 计算T统计量
   */
  static calculateTStatistic(controlValues, treatmentValues) {
    const controlMean = controlValues.reduce((a, b) => a + b, 0) / controlValues.length
    const treatmentMean = treatmentValues.reduce((a, b) => a + b, 0) / treatmentValues.length
    
    const controlVar = this.calculateVariance(controlValues)
    const treatmentVar = this.calculateVariance(treatmentValues)
    
    const n1 = controlValues.length
    const n2 = treatmentValues.length
    
    const stdError = Math.sqrt(controlVar/n1 + treatmentVar/n2)
    
    return (treatmentMean - controlMean) / stdError
  }

  /**
   * 计算方差
   */
  static calculateVariance(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2))
    return squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1)
  }
}

