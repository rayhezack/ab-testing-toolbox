#!/usr/bin/env python3

from SampleCalculator import SampleSizeCalculator
import math

def test_sample_size_calculation():
    """测试样本量计算的正确性"""
    
    # 初始化计算器
    calculator = SampleSizeCalculator(significance_level=0.05, power=0.8)
    
    # 测试参数
    baseline = 100
    variance = 25
    k = 1
    
    print("样本量计算测试结果:")
    print("=" * 50)
    print(f"基准值: {baseline}")
    print(f"方差: {variance}")
    print(f"K值: {k}")
    print(f"显著性水平: 0.05")
    print(f"统计功效: 0.8")
    print()
    
    # 测试不同MDE值
    mde_values = [0.1, 0.05, 0.01, 0.005]
    
    for mde in mde_values:
        sample_size = calculator.calculate_continuous_metric_sample_size(
            baseline=baseline,
            variance=variance,
            mde=mde,
            k=k
        )
        
        total_size = sample_size * (1 + k)
        
        print(f"MDE: {mde:.3f}")
        print(f"  对照组样本量: {sample_size}")
        print(f"  实验组样本量: {sample_size * k}")
        print(f"  总样本量: {total_size}")
        print()
    
    # 验证计算公式
    print("计算公式验证:")
    print("=" * 30)
    
    # 手动计算一个例子
    mde = 0.1
    z_alpha = calculator._get_critical_value(is_two_sided=True)
    z_beta = calculator.z_beta
    effect_size = mde * baseline
    
    print(f"Z_alpha (双尾检验): {z_alpha:.4f}")
    print(f"Z_beta: {z_beta:.4f}")
    print(f"效应大小: {effect_size}")
    
    # 手动计算样本量
    manual_sample_size = ((1 + 1/k) * (z_alpha + z_beta)**2 * variance) / (effect_size**2)
    manual_sample_size = math.ceil(manual_sample_size)
    
    print(f"手动计算样本量: {manual_sample_size}")
    
    # 使用计算器计算
    calc_sample_size = calculator.calculate_continuous_metric_sample_size(
        baseline=baseline, variance=variance, mde=mde, k=k
    )
    print(f"计算器样本量: {calc_sample_size}")
    
    assert manual_sample_size == calc_sample_size, "计算结果不匹配！"
    print("✅ 计算验证通过！")

if __name__ == "__main__":
    test_sample_size_calculation() 