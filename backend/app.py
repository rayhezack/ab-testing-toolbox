from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from scipy import stats
import json
import hashlib
from typing import Dict, List, Union, Tuple
import random

from SampleCalculator import SampleSizeCalculator
from experiment_analysis_with_seedfinder import ExperimentAnalysisWithSeedFinder

app = Flask(__name__)
CORS(app)

# 初始化计算器
sample_calculator = SampleSizeCalculator()
experiment_analyzer = ExperimentAnalysisWithSeedFinder()

@app.route('/sample-size', methods=['POST'])
def calculate_sample_size():
    try:
        data = request.get_json()
        
        # 提取参数
        metric_name = data.get('metric_name', 'metric')
        metric_type = data.get('metric_type', 'mean')
        baseline = data.get('baseline', 0)
        variance = data.get('variance', 1)
        mde = data.get('mde', 0.1)
        daily_traffic = data.get('daily_traffic', 1000)
        sample_ratio = data.get('sample_ratio', 0.1)
        k = data.get('k', 1)
        group_num = data.get('group_num', 2)
        
        # 根据指标类型计算样本量
        if metric_type == 'mean':
            control_sample_size = sample_calculator.calculate_continuous_metric_sample_size(
                baseline=baseline,
                variance=variance,
                mde=mde,
                k=k
            )
        elif metric_type == 'proportion':
            control_sample_size = sample_calculator.calculate_binary_metric_sample_size(
                baseline_rate=baseline,
                mde=mde,
                k=k
            )
        else:  # ratio
            # 比率类型指标暂不支持样本量计算
            return jsonify({'error': 'Ratio metric type does not support sample size calculation'}), 400
        
        treatment_sample_size = int(control_sample_size * k)
        total_sample_size = control_sample_size + treatment_sample_size * (group_num - 1)
        experiment_days = max(1, int(total_sample_size / (daily_traffic * sample_ratio)))
        
        result = {
            'metric_name': metric_name,
            'metric_type': metric_type,
            'control_sample_size': control_sample_size,
            'treatment_sample_size': treatment_sample_size,
            'total_sample_size': total_sample_size,
            'experiment_days': experiment_days,
            'mde': mde,
            'baseline': baseline,
            'group_num': group_num
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/experiment-analysis', methods=['POST'])
def experiment_analysis():
    try:
        data = request.get_json()
        
        group1 = data.get('group1', [])
        group2 = data.get('group2', [])
        test_type = data.get('test_type', 'welch')
        
        if not group1 or not group2:
            return jsonify({'error': 'Both groups must contain data'}), 400
        
        # 创建DataFrame格式的数据，以便使用experiment_analyzer的方法
        if test_type == 'ratio':
            # 比率检验：处理X/Y格式
            if isinstance(group1, dict) and isinstance(group2, dict):
                # 如果输入是字典格式 {X: [...], Y: [...]}
                x1, y1 = group1['X'], group1['Y']
                x2, y2 = group2['X'], group2['Y']
                
                # 创建DataFrame
                df_data = []
                for i in range(len(x1)):
                    df_data.append({
                        'group_name': 'control',
                        'x_var': x1[i],
                        'y_var': y1[i]
                    })
                for i in range(len(x2)):
                    df_data.append({
                        'group_name': 'treatment',
                        'x_var': x2[i],
                        'y_var': y2[i]
                    })
                
                df = pd.DataFrame(df_data)
                
                # 使用test_ratio方法
                result = experiment_analyzer.test_ratio(
                    data=df,
                    groupname='group_name',
                    treated_label='treatment',
                    control_label='control',
                    x_var='x_var',
                    y_var='y_var'
                )
                
                t_stat = result[4]  # T统计量
                p_value = result[5]  # P值
                ci = result[7]  # 置信区间
                
            else:
                return jsonify({'error': 'Ratio test requires X and Y data in dictionary format'}), 400
                
        else:
            # 均值和比例检验：处理简单数组格式
            # 创建DataFrame
            df_data = []
            for value in group1:
                df_data.append({
                    'group_name': 'control',
                    'metric': value
                })
            for value in group2:
                df_data.append({
                    'group_name': 'treatment',
                    'metric': value
                })
            
            df = pd.DataFrame(df_data)
            
            if test_type == 'welch' or test_type == 'mean':
                # 使用test_mean方法
                result = experiment_analyzer.test_mean(
                    data=df,
                    groupname='group_name',
                    treated_label='treatment',
                    control_label='control',
                    test_metric='metric'
                )
                
                t_stat = result[4]  # T统计量
                p_value = result[5]  # P值
                ci = result[7]  # 置信区间
                
            elif test_type == 'proportion':
                # 使用test_proportion方法
                result = experiment_analyzer.test_proportion(
                    data=df,
                    groupname='group_name',
                    treated_label='treatment',
                    control_label='control',
                    metric='metric'
                )
                
                t_stat = result[4]  # T统计量
                p_value = result[5]  # P值
                ci = result[7]  # 置信区间
                
            else:
                return jsonify({'error': f'Unsupported test type: {test_type}'}), 400
        
        result = {
            't_stat': float(t_stat),
            'p_value': float(p_value),
            'confidence_interval': ci,
            'test_type': test_type
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/rerandomization', methods=['POST'])
def rerandomization():
    try:
        data = request.get_json()
        
        # 提取参数
        input_data = data.get('data', [])
        selected_metrics = data.get('selectedMetrics', [])  # 用户选择的指标
        metric_types = data.get('metricTypes', {})  # 指标类型映射
        userIdColumn = data.get('userIdColumn', 'user_id')
        iterations = data.get('iterations', 1000)
        groupProportions = data.get('groupProportions', {'control': 50, 'treatment': 50})
        
        # 调试信息
        print(f"DEBUG: selected_metrics = {selected_metrics}")
        print(f"DEBUG: metric_types = {metric_types}")
        print(f"DEBUG: input_data columns = {list(input_data[0].keys()) if input_data else 'No data'}")
        
        # 处理可能的JSON转义字符问题
        selected_metrics_clean = []
        for metric in selected_metrics:
            if isinstance(metric, list) and len(metric) == 2:
                # 数组格式的比率指标，直接保留
                selected_metrics_clean.append(metric)
                print(f"DEBUG: Array metric: {metric}")
            else:
                # 字符串格式，移除可能的转义字符
                metric_clean = metric.replace('\\', '').replace('"', '')
                selected_metrics_clean.append(metric_clean)
                print(f"DEBUG: Original metric: '{metric}' -> Cleaned: '{metric_clean}'")
        
        selected_metrics = selected_metrics_clean
        
        # 清理metric_types中的键
        metric_types_clean = {}
        for key, value in metric_types.items():
            key_clean = key.replace('\\', '').replace('"', '')
            metric_types_clean[key_clean] = value
            print(f"DEBUG: Original key: '{key}' -> Cleaned: '{key_clean}'")
        
        metric_types = metric_types_clean
        
        if not input_data:
            return jsonify({'error': 'No valid data provided'}), 400
        
        # 转换为DataFrame
        df = pd.DataFrame(input_data)
        
        if df.empty:
            return jsonify({'error': 'Empty dataset'}), 400
        
        # 调试信息
        print(f"DEBUG: DataFrame shape = {df.shape}")
        print(f"DEBUG: DataFrame columns = {list(df.columns)}")
        print(f"DEBUG: DataFrame dtypes = {df.dtypes.to_dict()}")
        print(f"DEBUG: First few rows:")
        print(df.head())
        
        # 检查必要的列是否存在
        if userIdColumn not in df.columns:
            return jsonify({'error': f'User ID column "{userIdColumn}" not found'}), 400
        
        # 获取所有数值型列作为可用指标
        numeric_columns = []
        for col in df.columns:
            if col != userIdColumn and col not in ['group', 'group_name', 'treatment']:
                try:
                    pd.to_numeric(df[col], errors='raise')
                    numeric_columns.append(col)
                except:
                    continue
        
        if not numeric_columns:
            return jsonify({'error': 'No numeric columns found for metrics'}), 400
        
        # 如果用户没有选择指标，使用所有数值列
        if not selected_metrics:
            selected_metrics = numeric_columns[:3]  # 默认选择前3个指标
        
        # 验证选择的指标是否存在
        for metric in selected_metrics:
            # 对于比率指标，需要从metricTypes中找到对应的类型
            metric_type = None
            if isinstance(metric, list) and len(metric) == 2:
                # 数组格式的比率指标，需要在metricTypes中查找对应的JSON字符串键
                metric_key = json.dumps(metric)
                metric_type = metric_types.get(metric_key, 'ratio')
            else:
                metric_type = metric_types.get(metric, 'mean')
            
            print(f"DEBUG: Processing metric '{metric}' with type '{metric_type}'")
            print(f"DEBUG: Available columns: {list(df.columns)}")
            
            if metric_type == 'ratio':
                # 比率类型：检查分子和分母列是否存在
                if isinstance(metric, list) and len(metric) == 2:
                    # 新的数组格式：[numerator, denominator]
                    x_var, y_var = metric[0], metric[1]
                    print(f"DEBUG: Ratio metric (array format) - x_var: '{x_var}', y_var: '{y_var}'")
                else:
                    # 旧的字符串格式：处理可能的转义字符
                    metric_clean = metric.replace('\\', '').replace('"', '')
                    x_var, y_var = metric_clean.split('/')
                    print(f"DEBUG: Ratio metric (string format) - x_var: '{x_var}', y_var: '{y_var}'")
                
                if x_var not in df.columns:
                    print(f"DEBUG: x_var '{x_var}' not found in columns")
                    return jsonify({'error': f'Numerator column "{x_var}" not found for ratio metric "{metric}"'}), 400
                if y_var not in df.columns:
                    print(f"DEBUG: y_var '{y_var}' not found in columns")
                    return jsonify({'error': f'Denominator column "{y_var}" not found for ratio metric "{metric}"'}), 400
            else:
                # 其他类型：检查指标列是否存在
                if metric not in df.columns:
                    print(f"DEBUG: metric '{metric}' not found in columns")
                    return jsonify({'error': f'Metric column "{metric}" not found'}), 400
        
        # 验证指标类型
        valid_types = ['mean', 'proportion', 'ratio']
        for metric, metric_type in metric_types.items():
            if metric_type not in valid_types:
                return jsonify({'error': f'Invalid metric type for {metric}: {metric_type}. Must be one of {valid_types}'}), 400
        
        # 验证组别比例总和
        total_proportion = sum(groupProportions.values())
        if total_proportion != 100:
            return jsonify({'error': f'Group proportions must sum to 100%, current sum: {total_proportion}%'}), 400
        
        # 确保用户ID列是字符串类型
        df[userIdColumn] = df[userIdColumn].astype(str)
        
        # 确保指标列是数值类型
        for metric in selected_metrics:
            # 获取指标类型
            if isinstance(metric, list) and len(metric) == 2:
                metric_key = json.dumps(metric)
                metric_type = metric_types.get(metric_key, 'ratio')
            else:
                metric_type = metric_types.get(metric, 'mean')
            
            if metric_type == 'ratio':
                # 比率类型：确保分子和分母列是数值类型
                if isinstance(metric, list):
                    x_var, y_var = metric[0], metric[1]
                else:
                    metric_clean = metric.replace('\\', '')
                    x_var, y_var = metric_clean.split('/')
                df[x_var] = pd.to_numeric(df[x_var], errors='coerce')
                df[y_var] = pd.to_numeric(df[y_var], errors='coerce')
            else:
                # 其他类型：确保指标列是数值类型
                df[metric] = pd.to_numeric(df[metric], errors='coerce')
        
        # 移除包含NaN的行
        columns_to_check = [userIdColumn]
        for metric in selected_metrics:
            # 获取指标类型
            if isinstance(metric, list) and len(metric) == 2:
                metric_key = json.dumps(metric)
                metric_type = metric_types.get(metric_key, 'ratio')
            else:
                metric_type = metric_types.get(metric, 'mean')
            
            if metric_type == 'ratio':
                # 比率类型：检查分子和分母列
                if isinstance(metric, list):
                    x_var, y_var = metric[0], metric[1]
                else:
                    metric_clean = metric.replace('\\', '')
                    x_var, y_var = metric_clean.split('/')
                columns_to_check.extend([x_var, y_var])
            else:
                # 其他类型：检查指标列
                columns_to_check.append(metric)
        
        df = df.dropna(subset=columns_to_check)
        
        if df.empty:
            return jsonify({'error': 'No valid data after cleaning'}), 400
        
        # 生成实验名称
        experiment_name = f"rerandomization_{hashlib.md5(str(df[userIdColumn].tolist()).encode()).hexdigest()[:8]}"
        
        # 获取对照组名称（通常是第一个组）
        control_group = list(groupProportions.keys())[0]
        
        # 构建指标类型列表
        metric_types_list = []
        for metric in selected_metrics:
            if isinstance(metric, list) and len(metric) == 2:
                # 数组格式的比率指标，需要在metricTypes中查找对应的JSON字符串键
                metric_key = json.dumps(metric)
                metric_type = metric_types.get(metric_key, 'ratio')
            else:
                metric_type = metric_types.get(metric, 'mean')
            metric_types_list.append(metric_type)
        
        # 执行重随机
        best_seed = experiment_analyzer.generate_best_seed(
            df=df,
            metrics=selected_metrics,
            metric_types=metric_types_list,
            group_name='group_name',
            unit_id=userIdColumn,
            iterations=min(iterations, 100),  # 限制迭代次数以避免性能问题
            group_proportions=groupProportions,
            control_label=control_group
        )
        
        # 使用最佳种子分配组别
        df_with_groups = experiment_analyzer.assign_groups_with_seed(
            df=df,
            seed=best_seed,
            unit_id=userIdColumn,
            group_name='group_name',
            group_proportions=groupProportions
        )
        
        # 计算最佳种子的显著性检验结果
        best_seed_results = calculate_significance_tests(df_with_groups, selected_metrics, metric_types, groupProportions)
        
        # 计算所有迭代的T统计量
        all_t_stats = []
        top_seeds = []
        
        for i in range(min(iterations, 50)):  # 进一步限制迭代次数
            seed = f"seed_{i}"
            try:
                # 使用种子分配组别
                temp_df = experiment_analyzer.assign_groups_with_seed(
                    df=df,
                    seed=seed,
                    unit_id=userIdColumn,
                    group_name='group_name',
                    group_proportions=groupProportions
                )
                
                # 计算每个指标的T统计量（多组别情况下，计算所有组别对之间的最大T统计量）
                max_t_stat = 0
                for i, metric in enumerate(selected_metrics):
                    # 获取指标类型
                    if isinstance(metric, list) and len(metric) == 2:
                        metric_key = json.dumps(metric)
                        metric_type = metric_types.get(metric_key, 'ratio')
                    else:
                        metric_type = metric_types.get(metric, 'mean')
                    
                    # 计算所有组别对之间的统计量
                    group_names = list(groupProportions.keys())
                    for j in range(len(group_names)):
                        for k in range(j + 1, len(group_names)):
                            group1_name = group_names[j]
                            group2_name = group_names[k]
                            
                            # 根据指标类型选择不同的检验方法
                            if metric_type == 'mean':
                                # 使用test_mean方法
                                try:
                                    result = experiment_analyzer.test_mean(
                                        data=temp_df,
                                        groupname='group_name',
                                        treated_label=group2_name,
                                        control_label=group1_name,
                                        test_metric=metric
                                    )
                                    t_stat = result[4]  # T统计量在第5个位置
                                    max_t_stat = max(max_t_stat, abs(t_stat))
                                except Exception as e:
                                    print(f"Error in test_mean for {metric}: {e}")
                                    continue
                                    
                            elif metric_type == 'proportion':
                                # 使用test_proportion方法
                                try:
                                    result = experiment_analyzer.test_proportion(
                                        data=temp_df,
                                        groupname='group_name',
                                        treated_label=group2_name,
                                        control_label=group1_name,
                                        metric=metric
                                    )
                                    t_stat = result[4]  # T统计量在第5个位置
                                    max_t_stat = max(max_t_stat, abs(t_stat))
                                except Exception as e:
                                    print(f"Error in test_proportion for {metric}: {e}")
                                    continue
                                    
                            elif metric_type == 'ratio':
                                # 使用test_ratio方法
                                try:
                                    # 解析比率指标
                                    if isinstance(metric, list) and len(metric) == 2:
                                        # 新的数组格式：[numerator, denominator]
                                        x_var, y_var = metric[0], metric[1]
                                    else:
                                        # 旧的字符串格式
                                        x_var, y_var = metric.split('/')
                                    
                                    result = experiment_analyzer.test_ratio(
                                        data=temp_df,
                                        groupname='group_name',
                                        treated_label=group2_name,
                                        control_label=group1_name,
                                        x_var=x_var,
                                        y_var=y_var
                                    )
                                    t_stat = result[4]  # T统计量在第5个位置
                                    max_t_stat = max(max_t_stat, abs(t_stat))
                                except Exception as e:
                                    print(f"Error in test_ratio for {metric}: {e}")
                                    continue
                
                all_t_stats.append(max_t_stat)
                top_seeds.append({
                    'seed': seed,
                    'maxTStat': max_t_stat
                })
                
            except Exception as e:
                print(f"Error with seed {seed}: {e}")
                continue
        
        # 排序并获取前10个最佳种子
        top_seeds.sort(key=lambda x: x['maxTStat'])
        top_seeds = top_seeds[:10]
        
        if not top_seeds:
            return jsonify({'error': 'No valid seeds found. Please check your data and parameters.'}), 400
        
        result = {
            'bestSeed': best_seed,
            'bestSeedResults': best_seed_results,  # 新增：最佳种子的显著性检验结果
            'topSeeds': top_seeds,
            'allTStats': all_t_stats,
            'totalIterations': len(all_t_stats),
            'groupProportions': groupProportions,
            'selectedMetrics': selected_metrics,
            'availableMetrics': numeric_columns,  # 新增：所有可用指标
            'metricTypes': metric_types
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

def calculate_significance_tests(df, metrics, metric_types, group_proportions):
    """
    计算显著性检验结果
    """
    results = {}
    group_names = list(group_proportions.keys())
    
    for i, metric in enumerate(metrics):
        # 获取指标类型
        if isinstance(metric, list) and len(metric) == 2:
            # 数组格式的比率指标，需要在metricTypes中查找对应的JSON字符串键
            metric_key = json.dumps(metric)
            metric_type = metric_types.get(metric_key, 'ratio')
        else:
            # 字符串格式的指标，直接在metric_types字典中查找
            metric_type = metric_types.get(metric, 'mean')
        
        # 为结果创建一个键，如果是数组格式，使用字符串表示
        if isinstance(metric, list) and len(metric) == 2:
            result_key = f"{metric[0]}/{metric[1]}"
        else:
            result_key = metric
        
        results[result_key] = {
            'metric_type': metric_type,
            'tests': []
        }
        
        # 计算所有组别对之间的检验
        for j in range(len(group_names)):
            for k in range(j + 1, len(group_names)):
                group1_name = group_names[j]
                group2_name = group_names[k]
                
                try:
                    if metric_type == 'mean':
                        # 使用test_mean方法
                        result = experiment_analyzer.test_mean(
                            data=df,
                            groupname='group_name',
                            treated_label=group2_name,
                            control_label=group1_name,
                            test_metric=metric
                        )
                        test_result = {
                            'group1': str(group1_name),
                            'group2': str(group2_name),
                            'test_type': "Welch's t-test",
                            'statistic': float(result[4]) if not np.isnan(result[4]) else None,
                            'p_value': float(result[5]) if not np.isnan(result[5]) else None,
                            'significant': result[6] == "显著",
                            'group1_mean': float(result[1]) if not np.isnan(result[1]) else None,
                            'group2_mean': float(result[0]) if not np.isnan(result[0]) else None,
                            'group1_size': int(len(df[df['group_name'] == group1_name][metric].dropna())),
                            'group2_size': int(len(df[df['group_name'] == group2_name][metric].dropna()))
                        }
                        
                    elif metric_type == 'proportion':
                        # 使用test_proportion方法
                        result = experiment_analyzer.test_proportion(
                            data=df,
                            groupname='group_name',
                            treated_label=group2_name,
                            control_label=group1_name,
                            metric=metric
                        )
                        test_result = {
                            'group1': str(group1_name),
                            'group2': str(group2_name),
                            'test_type': "Proportion test",
                            'statistic': float(result[4]) if not np.isnan(result[4]) else None,
                            'p_value': float(result[5]) if not np.isnan(result[5]) else None,
                            'significant': result[6] == "显著",
                            'group1_mean': float(result[1]) if not np.isnan(result[1]) else None,
                            'group2_mean': float(result[0]) if not np.isnan(result[0]) else None,
                            'group1_size': int(len(df[df['group_name'] == group1_name][metric].dropna())),
                            'group2_size': int(len(df[df['group_name'] == group2_name][metric].dropna()))
                        }
                        
                    elif metric_type == 'ratio':
                        # 使用test_ratio方法
                        if isinstance(metric, list) and len(metric) == 2:
                            # 新的数组格式：[numerator, denominator]
                            x_var, y_var = metric[0], metric[1]
                        else:
                            # 旧的字符串格式
                            x_var, y_var = metric.split('/')
                        
                        result = experiment_analyzer.test_ratio(
                            data=df,
                            groupname='group_name',
                            treated_label=group2_name,
                            control_label=group1_name,
                            x_var=x_var,
                            y_var=y_var
                        )
                        test_result = {
                            'group1': str(group1_name),
                            'group2': str(group2_name),
                            'test_type': "Ratio test (Delta method)",
                            'statistic': float(result[4]) if not np.isnan(result[4]) else None,
                            'p_value': float(result[5]) if not np.isnan(result[5]) else None,
                            'significant': result[6] == "显著",
                            'group1_mean': float(result[1]) if not np.isnan(result[1]) else None,
                            'group2_mean': float(result[0]) if not np.isnan(result[0]) else None,
                            'group1_size': int(len(df[df['group_name'] == group1_name][x_var].dropna())),
                            'group2_size': int(len(df[df['group_name'] == group2_name][x_var].dropna()))
                        }
                    else:
                        raise ValueError(f"Unknown metric type: {metric_type}")
                    
                    results[result_key]['tests'].append(test_result)
                    
                except Exception as e:
                    # 如果测试失败，返回错误信息
                    test_result = {
                        'group1': str(group1_name),
                        'group2': str(group2_name),
                        'test_type': f"{metric_type.capitalize()} test",
                        'statistic': None,
                        'p_value': None,
                        'significant': False,
                        'error': str(e),
                        'group1_mean': None,
                        'group2_mean': None,
                        'group1_size': 0,
                        'group2_size': 0
                    }
                    results[result_key]['tests'].append(test_result)
    
    return results

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({
        'status': 'healthy',
        'message': 'AB Testing Toolbox Backend is running',
        'version': '2.0.0'
    })

if __name__ == '__main__':
    print("Starting AB Testing Toolbox Backend Server...")
    print("Server will be available at: http://0.0.0.0:8000")
    print("Health check: http://0.0.0.0:8000/health")
    
    app.run(
        host='0.0.0.0',
        port=8000,
        debug=False,
        threaded=True
    ) 