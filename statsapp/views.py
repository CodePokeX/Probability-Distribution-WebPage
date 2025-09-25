from django.shortcuts import render
from django.http import JsonResponse
from . import prob_funcs
import json

def index(request):
    return render(request, 'statsapp/index.html')

def api_compute(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)

    try:
        body = json.loads(request.body.decode('utf-8'))
    except Exception:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    dist = body.get('distribution')
    comparator = body.get('comparator')
    try:
        target = int(body.get('target'))
    except Exception:
        return JsonResponse({'error': 'target must be integer'}, status=400)

    params = {}
    try:
        if dist == 'binomial':
            params['n'] = int(body.get('n'))
            params['p'] = float(body.get('p'))
        elif dist == 'negbin':
            params['r'] = int(body.get('r'))
            params['p'] = float(body.get('p'))
        elif dist == 'geometric':
            params['p'] = float(body.get('p'))
        elif dist == 'poisson':
            params['lam'] = float(body.get('lam'))
        else:
            return JsonResponse({'error': 'Unknown distribution'}, status=400)
    except Exception as e:
        return JsonResponse({'error': 'Invalid parameters: ' + str(e)}, status=400)

    try:
        xs, ps = prob_funcs.support_and_pmf(dist, params)
        mean, var = prob_funcs.stats_for(dist, params)
        prob = prob_funcs.compute_probability_given_condition(dist, params, comparator, target)
    except Exception as e:
        return JsonResponse({'error': 'Computation error: ' + str(e)}, status=500)

    xs_list = xs
    ps_list = [float(p) for p in ps]

    return JsonResponse({
        'x': xs_list,
        'p': ps_list,
        'mean': float(mean),
        'variance': float(var),
        'probability': float(prob),
    })
