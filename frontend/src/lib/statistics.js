/**
 * 统计计算库
 * 基于Python代码中的算法实现JavaScript版本
 */

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
   * 分配分组到数据
   */
  static assignGroupsToData(data, experimentName, userIdColumn, groupProportions) {
    const groupedData = {}
    for (const groupName of Object.keys(groupProportions)) {
      groupedData[groupName] = []
    }

    for (const row of data) {
      const userId = row[userIdColumn]
      const assignedGroup = this.assignGroups(experimentName, userId, groupProportions)
      if (groupedData[assignedGroup]) {
        groupedData[assignedGroup].push(row)
      }
    }
    return groupedData
  }

  /**
   * 生成最佳种子
   */
  static async generateBestSeed(data, metrics, userIdColumn, iterations, groupProportions, onProgress) {
    // This function would typically interact with a backend API for actual rerandomization
    // For now, it's a placeholder.
    console.log('Generating best seed with provided parameters...')
    console.log('Data:', data)
    console.log('Metrics:', metrics)
    console.log('User ID Column:', userIdColumn)
    console.log('Iterations:', iterations)
    console.log('Group Proportions:', groupProportions)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))

    if (onProgress) {
      onProgress({ type: 'progress', message: 'Rerandomization complete!', progress: 100 })
    }

    return {
      bestSeed: Math.floor(Math.random() * 100000),
      tStatisticDistribution: Array.from({ length: 100 }, () => Math.random() * 5)
    }
  }
}


