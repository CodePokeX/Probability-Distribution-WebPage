import math
from typing import Tuple, List

def nCr(n: int, r: int) -> int:
    if r < 0 or r > n:
        return 0
    return math.comb(n, r)

# Binomial PMF: P(X=k) = C(n,k) p^k (1-p)^(n-k)
def binomial_pmf(n:int, p:float, k:int) -> float:
    if k < 0 or k > n:
        return 0.0
    return nCr(n, k) * (p**k) * ((1-p)**(n-k))

# Negative Binomial (total trials to r-th success)
# P(X=k) = C(k-1, r-1) * p^r * (1-p)^(k-r)  for k = r, r+1,...
def negbin_pmf_total_trials(r:int, p:float, k:int) -> float:
    if k < r:
        return 0.0
    failures = k - r
    return nCr(k - 1, r - 1) * (p**r) * ((1-p)**failures)

# Geometric: number of trials until first success (k >= 1)
# P(X=k) = (1-p)^(k-1) p
def geometric_pmf_trial_count(p:float, k:int) -> float:
    if k < 1:
        return 0.0
    return ((1-p)**(k-1)) * p

# Poisson: P(X=k) = e^-lambda * lambda^k / k!
def poisson_pmf(lamb:float, k:int) -> float:
    if k < 0:
        return 0.0
    return math.exp(-lamb) * (lamb**k) / math.factorial(k)

def support_and_pmf(dist:str, params:dict, x_min:int=None, x_max:int=None) -> Tuple[List[int], List[float]]:
    if dist == 'binomial':
        n = int(params['n'])
        p = float(params['p'])
        xs = list(range(0, n+1))
        ps = [binomial_pmf(n,p,k) for k in xs]
        return xs, ps
    if dist == 'negbin':
        r = int(params['r'])
        p = float(params['p'])
        mean = r/p
        var = r*(1-p)/(p**2)
        std = math.sqrt(var)
        cap = int(max(r+10, math.ceil(mean + 6*std)))  # start from k = r
        xs = list(range(r, cap+1))  
        ps = [negbin_pmf_total_trials(r,p,k) for k in xs]
        return xs, ps
    if dist == 'geometric':
        p = float(params['p'])
        mean = 1/p
        var = (1-p)/(p**2)
        std = math.sqrt(var)
        cap = int(max(10, math.ceil(mean + 6*std)))
        xs = list(range(1, cap+1))
        ps = [geometric_pmf_trial_count(p,k) for k in xs]
        return xs, ps
    if dist == 'poisson':
        lam = float(params['lam'])
        mean = lam
        var = lam
        std = math.sqrt(var)
        cap = int(max(10, math.ceil(mean + 6*std)))
        xs = list(range(0, cap+1))
        ps = [poisson_pmf(lam,k) for k in xs]
        return xs, ps
    raise ValueError('Unknown distribution')

def stats_for(dist:str, params:dict) -> Tuple[float, float]:
    if dist == 'binomial':
        n = int(params['n'])
        p = float(params['p'])
        mean = n*p
        var = n*p*(1-p)
        return mean, var
    if dist == 'negbin':
        r = int(params['r'])
        p = float(params['p'])
        mean = r/p           # mean of total trials
        var = r*(1-p)/(p**2)
        return mean, var
    if dist == 'geometric':
        p = float(params['p'])
        mean = 1/p
        var = (1-p)/(p**2)
        return mean, var
    if dist == 'poisson':
        lam = float(params['lam'])
        mean = lam
        var = lam
        return mean, var
    raise ValueError('Unknown distribution')

def compute_probability_given_condition(dist:str, params:dict, comparator:str, target:int) -> float:
    xs, ps = support_and_pmf(dist, params)
    if comparator == 'exact':
        return float(ps[xs.index(target)]) if target in xs else 0.0
    if comparator == '<=':
        total = 0.0
        for x, p in zip(xs, ps):
            if x <= target:
                total += p
        return total
    if comparator == '>=':
        total = 0.0
        for x, p in zip(xs, ps):
            if x >= target:
                total += p
        return total
    raise ValueError('Unknown comparator')
