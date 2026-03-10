<script>
  // :arch: savings vs openai cost comparison with animated counter and BarChart breakdown
  // :why: key freeloader value-prop display; animated counter via $effect; BarChart reuse
  // :rules: actualCost/openaiEquivalent numbers; byProvider=[{name,cost,openaiCost}]
  import { onMount } from 'svelte'
  import BarChart from './BarChart.svelte'

  let { actualCost = 0, openaiEquivalent = 0, byProvider = [] } = $props()

  const saved = $derived(openaiEquivalent - actualCost)
  const savingsPct = $derived(openaiEquivalent > 0 ? ((saved / openaiEquivalent) * 100).toFixed(1) : '0.0')

  let displayedSaved = $state(0)
  let animFrame = null

  $effect(() => {
    const target = saved
    const duration = 1200
    const start = performance.now()
    const from = displayedSaved
    function tick(now) {
      const t = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      displayedSaved = from + (target - from) * ease
      if (t < 1) animFrame = requestAnimationFrame(tick)
    }
    if (animFrame) cancelAnimationFrame(animFrame)
    animFrame = requestAnimationFrame(tick)
    return () => { if (animFrame) cancelAnimationFrame(animFrame) }
  })

  const fmt = (n) => `$${Math.abs(n).toFixed(2)}`

  // Comparison bar data for side-by-side bars
  const comparisonBars = $derived([
    { label: 'You paid', value: Number(actualCost.toFixed(4)), color: '#27864a' },
    { label: 'OpenAI', value: Number(openaiEquivalent.toFixed(4)), color: '#c0392b' }
  ])

  // Per-provider breakdown: alternate you paid / openai cost
  const providerBars = $derived(
    byProvider.flatMap(p => [
      { label: p.name, value: Number((p.cost || 0).toFixed(4)), color: '#27864a' },
      { label: `${p.name}*`, value: Number((p.openaiCost || 0).toFixed(4)), color: '#c0392b' }
    ])
  )
</script>

<div class="savings-wrap">
  <!-- Big savings display -->
  <div class="savings-hero">
    <div class="savings-label">You saved</div>
    <div class="savings-amount" class:positive={saved >= 0} class:negative={saved < 0}>
      {fmt(displayedSaved)}
    </div>
    <div class="savings-sub">{savingsPct}% cheaper than OpenAI equivalent</div>
  </div>

  <!-- Side-by-side comparison -->
  <div class="comparison-section">
    <div class="comparison-cols">
      <div class="comparison-col you">
        <div class="col-label">You paid</div>
        <div class="col-value green">{fmt(actualCost)}</div>
      </div>
      <div class="comparison-divider">vs</div>
      <div class="comparison-col openai">
        <div class="col-label">OpenAI would cost</div>
        <div class="col-value red">{fmt(openaiEquivalent)}</div>
      </div>
    </div>
    {#if comparisonBars.length > 0}
      <div class="comparison-chart">
        <BarChart data={comparisonBars} height={100} showLabels={true}/>
      </div>
    {/if}
  </div>

  <!-- Per-provider breakdown -->
  {#if byProvider.length > 0}
    <div class="provider-section">
      <div class="section-title">Per-provider breakdown</div>
      <div class="provider-legend">
        <span class="legend-dot" style="background:#27864a"></span><span>You paid</span>
        <span class="legend-dot" style="background:#c0392b;margin-left:0.75rem"></span><span>OpenAI equiv</span>
      </div>
      <BarChart data={providerBars} height={120} showLabels={true}/>
    </div>
  {/if}
</div>

<style>
  .savings-wrap { width: 100%; }
  .savings-hero {
    text-align: center;
    padding: 1rem 0 0.75rem;
  }
  .savings-label {
    font-size: 0.8rem;
    color: #8a7f78;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 0.25rem;
  }
  .savings-amount {
    font-size: 2.5rem;
    font-weight: 800;
    line-height: 1;
    transition: color 0.3s;
  }
  .savings-amount.positive { color: #27864a; }
  .savings-amount.negative { color: #c0392b; }
  .savings-sub {
    font-size: 0.75rem;
    color: #8a7f78;
    margin-top: 0.3rem;
  }
  .comparison-section { margin-top: 1rem; }
  .comparison-cols {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }
  .comparison-col { text-align: center; }
  .col-label { font-size: 0.7rem; color: #8a7f78; margin-bottom: 0.2rem; }
  .col-value { font-size: 1.25rem; font-weight: 700; }
  .col-value.green { color: #27864a; }
  .col-value.red { color: #c0392b; }
  .comparison-divider { font-size: 0.85rem; color: #5a5248; font-style: italic; }
  .comparison-chart { margin-top: 0.5rem; }
  .provider-section { margin-top: 1.25rem; border-top: 1px solid #3a3530; padding-top: 0.75rem; }
  .section-title { font-size: 0.75rem; color: #8a7f78; margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.06em; }
  .provider-legend { display: flex; align-items: center; gap: 0.3rem; font-size: 0.7rem; color: #8a7f78; margin-bottom: 0.5rem; }
  .legend-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
</style>
