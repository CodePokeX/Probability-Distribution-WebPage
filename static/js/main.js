document.addEventListener('DOMContentLoaded', () => {
  const paramsArea = document.getElementById('params-area');
  const distributionSelect = document.getElementById('distribution');
  const form = document.getElementById('prob-form');
  
  // Result area elements
  const resultArea = document.getElementById('result-area');
  const resultPlaceholder = document.getElementById('result-placeholder');
  const resultDisplay = document.getElementById('result-display');
  const resultMean = document.getElementById('result-mean');
  const resultVariance = document.getElementById('result-variance');
  const resultProbText = document.getElementById('result-prob-text');
  const resultProbValue = document.getElementById('result-prob-value');
  const computeBtn = document.getElementById('compute-btn');

  function renderParams() {
    const dist = distributionSelect.value;
    let html = '';
    if (dist === 'binomial') {
      html = `<div class="mb-3">
        <label for="param-n" class="form-label">Number of trials (n)</label>
        <input id="param-n" class="form-control" type="number" min="0" value="10">
      </div>
      <div class="mb-3">
        <label for="param-p" class="form-label">Probability p (0-1)</label>
        <input id="param-p" class="form-control" type="number" step="0.01" min="0" max="1" value="0.5">
      </div>`;
    } else if (dist === 'negbin') {
      html = `<div class="mb-3">
        <label for="param-r" class="form-label">Number of successes (r)</label>
        <input id="param-r" class="form-control" type="number" min="1" value="3">
      </div>
      <div class="mb-3">
        <label for="param-p" class="form-label">Probability p (0-1)</label>
        <input id="param-p" class="form-control" type="number" step="0.01" min="0" max="1" value="0.5">
      </div>
      <div class="form-text mb-3">We count <em>failures</em> before r-th success (k = 0,1,...).</div>`;
    } else if (dist === 'geometric') {
      html = `<div class="mb-3">
        <label for="param-p" class="form-label">Probability p (0-1)</label>
        <input id="param-p" class="form-control" type="number" step="0.01" min="0" max="1" value="0.3">
      </div>
      <div class="form-text mb-3">Geometric uses number of trials until first success (k = 1,2,...).</div>`;
    } else if (dist === 'poisson') {
      html = `<div class="mb-3">
        <label for="param-lam" class="form-label">Lambda (λ)</label>
        <input id="param-lam" class="form-control" type="number" step="0.1" min="0" value="4">
      </div>`;
    }
    paramsArea.innerHTML = html;
  }

  distributionSelect.addEventListener('change', renderParams);
  renderParams(); // Initial render

  let chart = null;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // UI feedback for loading
    computeBtn.disabled = true;
    const originalBtnText = computeBtn.innerHTML;
    computeBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Computing...`;

    const dist = distributionSelect.value;
    const comparator = document.getElementById('comparator').value;
    const target = parseInt(document.getElementById('target').value || '0');

    const payload = { distribution: dist, comparator, target };
    if (dist === 'binomial') {
      payload.n = parseInt(document.getElementById('param-n').value);
      payload.p = parseFloat(document.getElementById('param-p').value);
    } else if (dist === 'negbin') {
      payload.r = parseInt(document.getElementById('param-r').value);
      payload.p = parseFloat(document.getElementById('param-p').value);
    } else if (dist === 'geometric') {
      payload.p = parseFloat(document.getElementById('param-p').value);
    } else if (dist === 'poisson') {
      payload.lam = parseFloat(document.getElementById('param-lam').value);
    }

    try {
      const resp = await fetch('/api/compute/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(errorText);
      }
      
      const data = await resp.json();
      
      // Update UI with results
      resultPlaceholder.classList.add('d-none');
      resultMean.textContent = data.mean.toFixed(4);
      resultVariance.textContent = data.variance.toFixed(4);
      
      const comparatorSymbols = { "exact": "=", "<=": "≤", ">=": "≥" };
      resultProbText.textContent = `P(X ${comparatorSymbols[comparator]} ${target})`;
      resultProbValue.textContent = data.probability.toFixed(6);
      
      resultDisplay.classList.remove('d-none');

      // Update Chart
      updateChart(data, comparator, target);

    } catch (error) {
      resultDisplay.classList.add('d-none');
      resultPlaceholder.classList.remove('d-none');
      resultPlaceholder.innerHTML = `<i class="bi bi-exclamation-triangle-fill text-danger"></i><p class="text-danger">Error: ${error.message}</p>`;
      if (chart) {
        chart.destroy();
        chart = null;
      }
    } finally {
      // Restore button
      computeBtn.disabled = false;
      computeBtn.innerHTML = originalBtnText;
    }
  });

  function updateChart(data, comparator, target) {
    const ctx = document.getElementById('pmfChart').getContext('2d');
    const labels = data.x.map(x => x.toString());
    const values = data.p;

    const defaultBarColor = 'rgba(79, 70, 229, 0.6)';
    const highlightBarColor = 'rgba(16, 185, 129, 0.7)';
    const defaultBorderColor = 'rgba(79, 70, 229, 1)';
    const highlightBorderColor = 'rgba(16, 185, 129, 1)';

    const backgroundColors = data.x.map(val => {
      if (comparator === 'exact' && val === target) return highlightBarColor;
      if (comparator === '<=' && val <= target) return highlightBarColor;
      if (comparator === '>=' && val >= target) return highlightBarColor;
      return defaultBarColor;
    });
    
    const borderColors = data.x.map(val => {
      if (comparator === 'exact' && val === target) return highlightBorderColor;
      if (comparator === '<=' && val <= target) return highlightBorderColor;
      if (comparator === '>=' && val >= target) return highlightBorderColor;
      return defaultBorderColor;
    });

    if (chart) chart.destroy();
    
    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Probability P(X=k)',
          data: values,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
        }]
      },
      options: {
        animation: { duration: 600 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#334155',
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 12 },
            padding: 10,
            cornerRadius: 5,
            callbacks: {
              label: (context) => `P(X = ${context.label}) = ${context.parsed.y.toFixed(6)}`
            }
          }
        },
        scales: {
          y: { 
            beginAtZero: true,
            grid: { color: '#e2e8f0' }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }

  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }
});