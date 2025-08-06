import pandas as pd
import numpy as np
from scipy import stats
import math
from typing import List, Tuple, Dict, Any
from dataclasses import dataclass

@dataclass
class SampleSizeResult:
    """Class to store sample size calculation results for A/B testing experiments.
    
    Attributes:
        metric_name (str): Name of the metric being tested
        mde (float): Minimum Detectable Effect (MDE) used in the calculation
        control_sample_size (int): Required sample size for the control group
        treatment_sample_size (int): Required sample size for the treatment group
        total_sample_size (int): Total required sample size across all groups
        experiment_days (int, optional): Estimated number of days needed to run the experiment
    """
    metric_name: str
    mde: float
    control_sample_size: int
    treatment_sample_size: int
    total_sample_size: int
    experiment_days: int = None

class SampleSizeCalculator:
    """
    A comprehensive calculator for determining sample sizes in A/B testing experiments.
    Supports three types of metrics: mean, proportion, and ratio metrics.
    
    This calculator helps determine the minimum sample size required to detect
    a specified effect size with a given statistical power and significance level.
    """
    
    def __init__(self, significance_level: float = 0.05, power: float = 0.8):
        """
        Initialize the calculator with statistical parameters.
        
        Args:
            significance_level (float): The Type I error rate (alpha) for the test. Default is 0.05.
            power (float): The desired statistical power (1 - beta). Default is 0.8.
        """
        if not 0 < significance_level < 1 or not 0 < power < 1:
            raise ValueError("Significance level and power must be between 0 and 1.")

        self.significance_level = significance_level
        self.power = power
        self.z_beta = stats.norm.ppf(power)
        
    def _get_critical_value(self, is_two_sided: bool = True) -> float:
        """
        Calculate the critical Z-value for the given significance level.
        
        Args:
            is_two_sided (bool): Whether to use two-sided test. Default is True.
            
        Returns:
            float: The critical Z-value for the specified significance level
        """
        if is_two_sided:
            return stats.norm.ppf(1 - self.significance_level / 2)
        return stats.norm.ppf(1 - self.significance_level)
    
    def calculate_binary_metric_sample_size(self, baseline_rate: float, mde: float, k: float = 1, is_two_sided: bool = True) -> int:
        """
        Calculate required sample size for binary metrics (e.g., conversion rates).
        
        Args:
            baseline_rate (float): The expected rate in the control group (0-1)
            mde (float): Minimum Detectable Effect as a proportion of baseline
            k (float): Ratio of treatment group size to control group size. Default is 1.
            is_two_sided (bool): Whether to use two-sided test. Default is True.
            
        Returns:
            int: Required sample size for the control group
        """
        if not (0 < baseline_rate < 1):
            raise ValueError("Baseline rate must be between 0 and 1.")
        if mde <= 0:
            raise ValueError("MDE must be a positive number.")
        if k <= 0:
            raise ValueError("k (group ratio) must be a positive number.")

        z_alpha = self._get_critical_value(is_two_sided)
        var = baseline_rate * (1 - baseline_rate)
        delta = baseline_rate * mde
        if delta == 0:
            raise ValueError("Calculated effect size (delta) is 0, cannot calculate sample size.")
        
        n = (1/k * (baseline_rate + delta) * (1 - baseline_rate - delta) + var) * pow(z_alpha + self.z_beta, 2) / pow(delta, 2)
        return math.ceil(n)
    
    def calculate_continuous_metric_sample_size(self, baseline: float, variance: float, mde: float, k: float = 1, is_two_sided: bool = True) -> int:
        """
        Calculate required sample size for continuous metrics (e.g., revenue, time spent).
        
        Args:
            baseline (float): The expected value in the control group
            variance (float): The variance of the metric
            mde (float): Minimum Detectable Effect as a proportion of baseline
            k (float): Ratio of treatment group size to control group size. Default is 1.
            is_two_sided (bool): Whether to use two-sided test. Default is True.
            
        Returns:
            int: Required sample size for the control group
        """
        if baseline <= 0:
            raise ValueError("Baseline must be a positive number.")
        if variance <= 0:
            raise ValueError("Variance must be a positive number for continuous metrics.")
        if mde <= 0:
            raise ValueError("MDE must be a positive number.")
        if k <= 0:
            raise ValueError("k (group ratio) must be a positive number.")

        z_alpha = self._get_critical_value(is_two_sided)
        effect_size = mde * baseline
        if effect_size == 0:
             raise ValueError("MDE or baseline is 0, cannot calculate relative effect size.")
        
        sample_size = ((1 + 1/k) * pow(z_alpha + self.z_beta, 2) * variance) / pow(effect_size, 2)
        return math.ceil(sample_size)
    
    def calculate_ratio_metric_sample_size(self, baseline_ratio: float, x_variance: float, y_variance: float, 
                                          xy_covariance: float, mde: float, k: float = 1, is_two_sided: bool = True) -> int:
        """
        Calculate required sample size for ratio metrics (e.g., revenue per user, conversion rate).
        
        Args:
            baseline_ratio (float): The expected ratio in the control group
            x_variance (float): The variance of the numerator (X)
            y_variance (float): The variance of the denominator (Y)
            xy_covariance (float): The covariance between X and Y
            mde (float): Minimum Detectable Effect as a proportion of baseline ratio
            k (float): Ratio of treatment group size to control group size. Default is 1.
            is_two_sided (bool): Whether to use two-sided test. Default is True.
            
        Returns:
            int: Required sample size for the control group
        """
        if baseline_ratio <= 0:
            raise ValueError("Baseline ratio must be a positive number.")
        if x_variance <= 0 or y_variance <= 0:
            raise ValueError("Variances must be positive numbers.")
        if mde <= 0:
            raise ValueError("MDE must be a positive number.")
        if k <= 0:
            raise ValueError("k (group ratio) must be a positive number.")

        z_alpha = self._get_critical_value(is_two_sided)
        effect_size = mde * baseline_ratio
        
        # 计算比率的标准差
        # Var(X/Y) ≈ (μ_X/μ_Y)² * (Var(X)/μ_X² + Var(Y)/μ_Y² - 2*Cov(X,Y)/(μ_X*μ_Y))
        # 假设 μ_X = baseline_ratio * μ_Y，我们可以简化计算
        ratio_variance = x_variance + (baseline_ratio ** 2) * y_variance - 2 * baseline_ratio * xy_covariance
        
        if ratio_variance <= 0:
            raise ValueError("Calculated ratio variance is not positive.")
        
        sample_size = ((1 + 1/k) * pow(z_alpha + self.z_beta, 2) * ratio_variance) / pow(effect_size, 2)
        return math.ceil(sample_size)
    
    def calculate_experiment_requirements(
        self,
        metrics_params: List[Dict[str, Any]],
        mde_range: Tuple[float, float, float],
        daily_traffic: int,
        sample_ratio: float,
        k: float = 1,
        group_num: int = 2,
        is_two_sided: bool = True
    ) -> pd.DataFrame:
        """
        Calculate comprehensive experiment requirements for multiple metrics and MDEs.
        
        Args:
            metrics_params (List[Dict[str, Any]]): A list of dictionaries, where each dictionary
                                         contains parameters for a single metric.
                                         For 'mean' type: {'metric_name': str, 'metric_type': 'mean', 'baseline': float, 'variance': float}
                                         For 'proportion' type: {'metric_name': str, 'metric_type': 'proportion', 'baseline_rate': float}
            mde_range (Tuple[float, float, float]): (start, end, step) for MDE range
            daily_traffic (int): Expected daily traffic
            sample_ratio (float): Ratio of traffic to include in experiment
            k (float): Ratio of treatment group proportion to control group proportion. Default is 1.
            group_num (int): Number of experimental groups. Default is 2 (control + treatment).
            is_two_sided (bool): Whether to use two-sided test. Default is True.
            
        Returns:
            pd.DataFrame: DataFrame containing the following columns:
                - metric_name: Name of the metric
                - mde: Minimum Detectable Effect
                - control_sample_size: Required sample size for control group
                - treatment_sample_size: Required sample size for treatment group
                - total_sample_size: Total required sample size
                - experiment_days: Estimated number of days needed
        """
        results = []
        start, end, step = mde_range
        
        if daily_traffic <= 0 or sample_ratio <= 0:
            raise ValueError("Daily traffic and sample ratio must be positive numbers.")
        if k <= 0 or group_num < 2:
            raise ValueError("k must be positive and group_num must be at least 2.")

        for metric_param in metrics_params:
            for mde in np.arange(start, end + step, step):
                try:
                    control_sample = 0
                    metric_type = metric_param.get('metric_type')
                    metric_name = metric_param.get('metric_name', 'Unnamed Metric')
                    
                    if metric_type == 'mean':
                        baseline = metric_param.get('baseline')
                        variance = metric_param.get('variance')
                        if baseline is None or variance is None:
                            raise ValueError(f"Missing 'baseline' or 'variance' for mean metric '{metric_name}'.")
                        control_sample = self.calculate_continuous_metric_sample_size(float(baseline), float(variance), float(mde), float(k), is_two_sided)
                    elif metric_type == 'proportion':
                        baseline_rate = metric_param.get('baseline_rate')
                        if baseline_rate is None:
                            raise ValueError(f"Missing 'baseline_rate' for proportion metric '{metric_name}'.")
                        control_sample = self.calculate_binary_metric_sample_size(float(baseline_rate), float(mde), float(k), is_two_sided)
                    else:
                        raise ValueError(f"Unknown metric type: {metric_type}")
                    
                    treated_sample = math.ceil(control_sample * k)
                    total_sample = control_sample + treated_sample * (group_num - 1)
                    exp_days = math.ceil(total_sample / (daily_traffic * sample_ratio))
                    
                    results.append({
                        'metric_name': metric_name,
                        'mde': mde,
                        'control_sample_size': control_sample,
                        'treatment_sample_size': treated_sample,
                        'total_sample_size': total_sample,
                        'experiment_days': exp_days
                    })
                except Exception as e:
                    print(f"Error calculating for metric '{metric_name}' and MDE '{mde}': {e}")
                    results.append({
                        'metric_name': metric_name,
                        'mde': mde,
                        'control_sample_size': np.nan,
                        'treatment_sample_size': np.nan,
                        'total_sample_size': np.nan,
                        'experiment_days': np.nan
                    })
        
        return pd.DataFrame(results)