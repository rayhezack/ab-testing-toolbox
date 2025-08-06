// API配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// API请求函数
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, {
      ...defaultOptions,
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// 具体的API函数
export const api = {
  // 样本量计算
  calculateSampleSize: (data) => apiRequest('/sample-size', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // 实验分析
  experimentAnalysis: (data) => apiRequest('/experiment-analysis', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // 重随机化
  rerandomization: (data) => apiRequest('/rerandomization', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // 健康检查
  healthCheck: () => apiRequest('/health'),
};

export default api; 