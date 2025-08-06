"""
ExperimentAnalysis with SeedFinder Integration
整合了实验分析和重随机种子选择功能的完整类
"""

import pandas as pd
import numpy as np
from scipy import stats
import hashlib
from statsmodels.stats.multitest import multipletests
from typing import Dict, List, Union, Tuple
from tqdm import tqdm

class ExperimentAnalysisWithSeedFinder:
    def __init__(self):
        self.alpha = 0.05  # Default significance level
    
    @staticmethod
    def apollo_bucket(experiment_name: str, individual_id: Union[str, List[str], int, float]) -> Union[int, Tuple[List[int], List]]:
        """
        Generate consistent bucket numbers (0-99) for experimental units.
        
        Args:
            experiment_name (str): Name of the experiment for consistent bucketing
            individual_id (str/list/int/float): Individual identifier(s) to be bucketed
        
        Returns:
            Union[int, Tuple[List[int], List]]: Bucket number(s) for the individual(s)
        """
        def _single_apollo_bucket(exp_name: str, ind_id: Union[str, int, float]) -> int:
            sha1 = hashlib.sha1()
            if isinstance(ind_id, (float, int)):
                ind_id = '{:.0f}'.format(ind_id)
            else:
                ind_id = str(ind_id)
            raw_key = ind_id + exp_name + 'exp_bucket'
            sha1.update(bytes(raw_key, encoding='UTF-8'))
            sha1_int = int.from_bytes(sha1.digest()[-4:], byteorder='big')
            return sha1_int % 100

        if isinstance(individual_id, list):
            return [_single_apollo_bucket(experiment_name, x) for x in individual_id], individual_id
        return _single_apollo_bucket(experiment_name, individual_id)

    def assign_groups(self, experiment_name: str, individual_id: str, group_proportions: Dict[str, Union[str, float, int]]) -> str:
        """
        Assign groups based on bucket number and group proportions.
        
        Args:
            experiment_name (str): Name of the experiment
            individual_id (str): Individual identifier
            group_proportions (dict): Dictionary of group names and their proportions
        
        Returns:
            str: Assigned group name
        """
        def extract_percentage(input_value: Union[str, float, int]) -> int:
            if isinstance(input_value, str):
                if input_value.endswith('%'):
                    return int(input_value[:-1])
                try:
                    float_value = float(input_value)
                    return int(float_value * 100) if 0 <= float_value <= 1 else int(float_value)
                except ValueError:
                    raise ValueError(f"Invalid input string: {input_value}")
            elif isinstance(input_value, (float, int)):
                return int(input_value * 100) if 0 <= input_value <= 1 else int(input_value)
            raise ValueError("Input must be a string, integer, or float.")

        total_percentage = sum(extract_percentage(val) for val in group_proportions.values())
        if total_percentage != 100:
            raise ValueError("The sum of all proportions must equal 100")

        start_bucket = 0
        for group, prop in group_proportions.items():
            prop = extract_percentage(prop)
            if start_bucket <= self.apollo_bucket(experiment_name, individual_id) < start_bucket + prop:
                return group
            start_bucket += prop
        # Return last group if no match found
        return list(group_proportions.keys())[-1]

    def generate_best_seed(self, df: pd.DataFrame, metrics: List[str], metric_types: List[str], 
                          group_name: str, unit_id: str, iterations: int, 
                          group_proportions: Dict[str, Union[str, float, int]], 
                          control_label: str = None) -> str:
        """
        Find the best random seed using re-randomization to minimize imbalance across metrics.
        
        This method implements the SeedFinder algorithm:
        1. Generate multiple random seeds
        2. For each seed, assign groups and calculate t-statistics for all metrics
        3. Find the maximum absolute t-statistic for each seed (worst case imbalance)
        4. Select the seed with the minimum maximum t-statistic
        
        Args:
            df (pd.DataFrame): Input dataset
            metrics (List[str]): List of metrics to test
            metric_types (List[str]): List of metric types ('mean', 'ratio', or 'proportion')
            group_name (str): Column name for group assignments
            unit_id (str): Column name containing unit identifiers
            iterations (int): Number of random seeds to try
            group_proportions (dict): Dictionary of group names and their proportions
            control_label (str): Label for control group (if None, will auto-detect)
        
        Returns:
            str: The best random seed for group assignment
        """
        # Auto-detect control label if not provided
        if control_label is None:
            control_keys = [k for k in group_proportions.keys() if "control" in k.lower()]
            if control_keys:
                control_label = control_keys[0]
            else:
                control_label = list(group_proportions.keys())[0]
        
        # Get treatment labels
        treatment_labels = [k for k in group_proportions.keys() if k != control_label]
        
        seed_scores = []
        
        for _ in tqdm(range(iterations), desc="Testing random seeds"):
            # Generate random seed
            random_seed = 'rr' + str(int(np.random.rand() * 1000000))
            
            # Create a copy of the dataframe for this iteration
            df_copy = df.copy()
            
            # Assign groups based on current seed
            df_copy[group_name] = df_copy[unit_id].apply(
                lambda x: self.assign_groups(random_seed, str(x), group_proportions)
            )
            
            # Run statistical tests for all metrics and treatment groups
            try:
                stats_df = self.run_statistical_tests(
                    df_copy, metrics, metric_types, group_name, 
                    treatment_labels, control_label, is_two_sided=True
                )
                
                # Find the maximum absolute t-statistic (worst case imbalance)
                max_t_stat = stats_df['T_Statistic'].abs().max()
                seed_scores.append((random_seed, max_t_stat))
                
            except Exception as e:
                # Skip this seed if there's an error
                print(f"Error with seed {random_seed}: {e}")
                continue
        
        if not seed_scores:
            raise ValueError("No valid seeds found. Please check your data and parameters.")
        
        # Select the seed with minimum maximum t-statistic
        best_seed, best_score = min(seed_scores, key=lambda x: x[1])
        
        # Print top 3 seeds for reference
        print("\nTop 3 candidate seeds by max T-statistic (lower is better):")
        for s, t in sorted(seed_scores, key=lambda x: x[1])[:3]:
            print(f"Seed: {s}, Max T-statistic: {t:.4f}")
        
        print(f"\nSelected Best Seed: {best_seed}, with Max T-statistic: {best_score:.4f}")
        
        return best_seed

    def assign_groups_with_seed(self, df: pd.DataFrame, seed: str, unit_id: str, 
                               group_name: str, group_proportions: Dict[str, Union[str, float, int]]) -> pd.DataFrame:
        """
        Assign groups to a dataframe using a specific seed.
        
        Args:
            df (pd.DataFrame): Input dataset
            seed (str): Random seed for group assignment
            unit_id (str): Column name containing unit identifiers
            group_name (str): Column name for group assignments
            group_proportions (dict): Dictionary of group names and their proportions
        
        Returns:
            pd.DataFrame: DataFrame with group assignments added
        """
        df_copy = df.copy()
        df_copy[group_name] = df_copy[unit_id].apply(
            lambda x: self.assign_groups(seed, str(x), group_proportions)
        )
        return df_copy

    def test_mean(self, data: pd.DataFrame, groupname: str, treated_label: str, 
                  control_label: str, test_metric: str, is_two_sided: bool = True, 
                  alternative: str = 'two-sided') -> List:
        """Conduct t-test for mean metrics."""
        treated = data[data[groupname] == treated_label][test_metric]
        control = data[data[groupname] == control_label][test_metric]
        treated_mean = treated.mean()
        control_mean = control.mean()
        
        # Calculate variance and standard error
        var_treated = np.var(treated, ddof=1)
        var_control = np.var(control, ddof=1)
        n_treated = len(treated)
        n_control = len(control)
        std_error = np.sqrt(var_treated/n_treated + var_control/n_control)

        # Calculate mean
        mae = treated_mean - control_mean
        mape = treated_mean / control_mean - 1
        
        # Welch-Satterthwaite degrees of freedom
        df = (
             (var_treated / n_treated + var_control / n_control) ** 2 /
             (
                ((var_treated / n_treated) ** 2) / (n_treated - 1) +
                ((var_control / n_control) ** 2) / (n_control - 1)
            )
            )

        # Calculate T Statistic
        t_stat = (treated_mean - control_mean) / std_error
        
        # 计算 p 值
        if is_two_sided:
            p_value = stats.t.sf(np.abs(t_stat), df) * 2
        else:
            if alternative == 'greater':
                p_value = stats.t.sf(np.abs(t_stat), df)
            elif alternative == 'less':
                p_value = stats.t.cdf(np.abs(t_stat), df)

        # 构建置信区间
        if alternative == 'two-sided':
            t_value = stats.t.ppf(1 - self.alpha/2, df)
            margin = t_value * std_error
            ci = [round(mae - margin, 6), round(mae + margin, 6)]
        else:
            t_value = stats.t.ppf(1 - self.alpha, df)
            if alternative == 'less':
                ci = [float('-inf'), round(mae + t_value * std_error, 6)]
            else:  # alternative == 'greater'
                ci = [round(mae - t_value * std_error, 6), float('inf')]

        # 计算显著性
        sig = "显著" if p_value < self.alpha else "不显著"
        
        return [treated_mean, control_mean, mae, mape, t_stat, p_value, sig, ci]

    def _get_ratio_variance(self, x: np.ndarray, y: np.ndarray) -> float:
        """Calculate variance for ratio metrics."""
        x_var = np.var(x, ddof=1)/len(x)
        y_var = np.var(y, ddof=1)/len(y)
        x_mean, y_mean = np.mean(x), np.mean(y)
        cov = np.cov(x, y)[0,1]/len(x)
        
        return (1/pow(y_mean,2)*x_var + 
                pow(x_mean,2)/pow(y_mean,4)*y_var - 
                2*x_mean/pow(y_mean,3)*cov)

    def test_ratio(self, data: pd.DataFrame, groupname: str, treated_label: str,
                   control_label: str, x_var: str, y_var: str, is_two_sided: bool = True,
                   alternative: str = 'two-sided') -> List:
        """Conduct statistical test for ratio metrics."""
        treated_data = data[data[groupname] == treated_label]
        control_data = data[data[groupname] == control_label]
        
        x_treated, y_treated = treated_data[x_var], treated_data[y_var]
        x_control, y_control = control_data[x_var], control_data[y_var]
        
        treated_ratio = np.sum(x_treated) / np.sum(y_treated)
        control_ratio = np.sum(x_control) / np.sum(y_control)
        
        diff = treated_ratio - control_ratio
        relative_diff = diff / control_ratio
        
        var_treat = self._get_ratio_variance(x_treated, y_treated)
        var_control = self._get_ratio_variance(x_control, y_control)
        n_treat,n_control = len(treated_data),len(control_data)

        std_error = np.sqrt(
            self._get_ratio_variance(x_treated, y_treated) +
            self._get_ratio_variance(x_control, y_control)
        )

        df = (var_treat + var_control) ** 2 / ((var_treat ** 2) / (n_treat - 1) + (var_control ** 2) / (n_control - 1))
        
        t_stat = diff / std_error
        
        # 计算P值
        if is_two_sided:
            p_value = stats.t.sf(np.abs(t_stat), df) * 2
        else:
            if alternative == 'greater':
                p_value = stats.t.sf(np.abs(t_stat), df)
            elif alternative == 'less':
                p_value = stats.t.cdf(np.abs(t_stat), df)

        # 构建增量delta的置信区间
        # 置信区间与显著性判断
        if is_two_sided:
            t_value = stats.t.ppf(1 - self.alpha/2, df)
            margin = t_value * std_error
            ci = [round(diff - margin, 6), round(diff + margin, 6)]
        else:
            t_value = stats.t.ppf(1 - self.alpha, df)
            if alternative == 'less':
                ci = [float('-inf'), round(diff + t_value * std_error, 6)]
            else:  # alternative == 'greater'
                ci = [round(diff - t_value * std_error, 6), float('inf')]
        
        sig = "显著" if p_value < self.alpha else "不显著"
        
        return [treated_ratio, control_ratio, diff, relative_diff, t_stat, p_value, sig, ci]

    def test_proportion(self, data: pd.DataFrame, groupname: str, treated_label: str,
                       control_label: str, metric: str, is_two_sided: bool = True,
                       alternative: str = 'two-sided') -> List:
        
        """Conduct binomial test for proportion metrics."""

        treated = data[data[groupname] == treated_label][metric]
        control = data[data[groupname] == control_label][metric]
        
        treated_rate = treated.mean()
        control_rate = control.mean()
        
        diff = treated_rate - control_rate
        relative_diff = diff / control_rate
        
        std_error = np.sqrt(
            treated_rate*(1-treated_rate)/len(treated) +
            control_rate*(1-control_rate)/len(control)
        )
        
        t_stat = diff / std_error
        
        if is_two_sided:
            p_value = 2 * stats.norm.sf(abs(t_stat))
        else:
            if alternative == 'greater':
                p_value = stats.norm.sf(np.abs(t_stat))
            elif alternative == 'less':
                p_value = stats.norm.cdf(np.abs(t_stat))

        if is_two_sided:
            z_value = stats.norm.ppf(1 - self.alpha/2)
            ci = [round(diff - z_value * std_error, 6),round(diff + z_value * std_error, 6)]
        else:
            if alternative == 'greater':
                z_value = stats.norm.ppf(1 - self.alpha)
                ci = [round(diff - z_value * std_error, 6), float('inf')]
            elif alternative == 'less':
                z_value = stats.norm.ppf(1 - self.alpha)
                ci = [float('-inf'), round(diff + z_value * std_error, 6)]
        
        sig = "显著" if p_value < self.alpha else "不显著"
        
        return [treated_rate, control_rate, diff, relative_diff, t_stat, p_value, sig, ci]

    def run_statistical_tests(self, data: pd.DataFrame, metrics: List[str], 
                            metric_types: List[str], groupname: str,
                            treated_labels: Union[str, List[str]], control_label: str,
                            is_two_sided: bool = True, alternative: str = 'two-sided',
                            bh_correction: bool = False) -> pd.DataFrame:
        """
        Run statistical tests for multiple metrics and multiple treatment groups.
        
        Args:
            data (pd.DataFrame): Input dataset
            metrics (List[str]): List of metrics to test
            metric_types (List[str]): List of metric types ('mean', 'ratio', or 'proportion')
            groupname (str): Column name containing group labels
            treated_labels (str or List[str]): Label(s) for treatment group(s)
            control_label (str): Label for control group
            is_two_sided (bool): Whether to perform two-sided test
            alternative (str): 'two-sided', 'less', or 'greater'
        
        Returns:
            pd.DataFrame: Statistical test results
        """
        # Convert single treatment label to list for consistent processing
        if isinstance(treated_labels, str):
            treated_labels = [treated_labels]
        
        results = []
        for treated_label in treated_labels:
            for metric, metric_type in zip(metrics, metric_types):
                if metric_type == 'mean':
                    result = self.test_mean(data, groupname, treated_label, control_label,
                                          metric, is_two_sided, alternative)
                elif metric_type == 'ratio':
                    # 支持数组格式和字符串格式的比率指标
                    if isinstance(metric, list) and len(metric) == 2:
                        # 数组格式：[numerator, denominator]
                        x_var, y_var = metric[0], metric[1]
                    else:
                        # 字符串格式：x_var/y_var
                        x_var, y_var = metric.split('/')
                    result = self.test_ratio(data, groupname, treated_label, control_label,
                                           x_var, y_var, is_two_sided, alternative)
                elif metric_type == 'proportion':
                    result = self.test_proportion(data, groupname, treated_label, control_label,
                                               metric, is_two_sided, alternative)
                else:
                    raise ValueError(f"Unsupported metric type: {metric_type}")
                
                results.append([treated_label, metric] + result)
        
        results_df = pd.DataFrame(
            results,
            columns=['Treatment_Group', 'Metric', 'Treatment_Value', 'Control_Value',
                    'Absolute_Diff', 'Relative_Diff', 'T_Statistic', 'P_Value',
                    'Significance','Confidence_Interval']
        )
        
        # Round all numeric columns to 6 decimal places
        numeric_columns = ['Treatment_Value', 'Control_Value', 'Absolute_Diff', 
                         'Relative_Diff', 'T_Statistic', 'P_Value']
        for col in numeric_columns:
            results_df[col] = results_df[col].apply(lambda x: round(x, 6) if isinstance(x, (int, float)) else x)

        if bh_correction:
            _, p_values, _, _ = multipletests(results_df['P_Value'], method='fdr_bh')
            results_df['P_Value_BH'] = p_values
            results_df['Significance_BH'] = results_df['P_Value_BH'] < self.alpha
            results_df['Significance_BH'] = results_df['Significance_BH'].apply(
                lambda x: "显著" if x else "不显著"
            )
        
        return results_df 