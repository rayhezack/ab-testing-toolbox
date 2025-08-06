import { useState } from 'react'
import { Calculator, BarChart3, Shuffle } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import SampleSizeCalculator from './components/SampleSizeCalculator'
import SignificanceTest from './components/SignificanceTest'
import Rerandomization from './components/Rerandomization'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('sample-size')

  const tabs = [
    {
      id: 'sample-size',
      name: '样本量计算器',
      icon: Calculator,
      component: SampleSizeCalculator
    },
    {
      id: 'significance-test',
      name: '显著性检验',
      icon: BarChart3,
      component: SignificanceTest
    },
    {
      id: 'rerandomization',
      name: '重随机',
      icon: Shuffle,
      component: Rerandomization
    }
  ]

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-lg">
                <BarChart3 className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-4xl font-bold text-white">A/B实验工具箱</h1>
            </div>
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              专业的A/B测试分析平台，提供样本量计算、显著性检验和重随机三大核心功能。
              基于严谨的统计学原理，帮助您科学地设计和分析实验，做出数据驱动的决策。
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-white/80">
              <div className="flex items-center space-x-2">
                <Calculator className="w-4 h-4" />
                <span>精确样本量计算</span>
              </div>
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>多指标显著性检验</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shuffle className="w-4 h-4" />
                <span>智能重随机优化</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {ActiveComponent && <ActiveComponent />}
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="footer-text">
            由 Ray (数据科学家) 设计与开发
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App

