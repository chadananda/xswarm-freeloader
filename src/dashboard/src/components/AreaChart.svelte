<script>
  // :arch: pure SVG area/line chart for time series; gradient fill; hover dots
  // :why: zero deps; responsive viewBox; dark paper palette
  // :rules: data=[{date,value}]; color prop for gradient; filled prop toggles area
  let { data = [], height = 200, color = '#27864a', filled = true } = $props()

  const PADDING = { top: 10, right: 15, bottom: 35, left: 45 }
  const W = 400
  const H = height
  const gradId = `area-grad-${Math.random().toString(36).slice(2, 7)}`

  let hoveredIdx = $state(-1)

  const innerW = $derived(W - PADDING.left - PADDING.right)
  const innerH = $derived(H - PADDING.top - PADDING.bottom)

  const vals = $derived(data.map(d => d.value))
  const minVal = $derived(Math.min(...vals, 0))
  const maxVal = $derived(Math.max(...vals, 1))
  const valRange = $derived(Math.max(maxVal - minVal, 1))

  function xAt(i) {
    return PADDING.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW)
  }
  function yAt(v) {
    return PADDING.top + innerH - ((v - minVal) / valRange) * innerH
  }

  const points = $derived(data.map((d, i) => ({ x: xAt(i), y: yAt(d.value), ...d })))

  const linePath = $derived(
    points.length < 2 ? '' :
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  )
  const areaPath = $derived(
    linePath.length === 0 ? '' :
    `${linePath} L${points[points.length - 1].x.toFixed(1)},${(PADDING.top + innerH).toFixed(1)} L${PADDING.left.toFixed(1)},${(PADDING.top + innerH).toFixed(1)} Z`
  )

  // Y-axis ticks
  const yTicks = $derived(() => {
    const count = 4
    return Array.from({ length: count + 1 }, (_, i) => {
      const v = minVal + (valRange / count) * i
      return { v, y: yAt(v), label: v >= 1000 ? `${(v/1000).toFixed(1)}k` : v.toFixed(v < 1 ? 3 : 1) }
    })
  })

  // X-axis labels — show up to 5 evenly distributed
  const xLabels = $derived(() => {
    if (data.length === 0) return []
    const step = Math.max(1, Math.floor(data.length / 5))
    const indices = []
    for (let i = 0; i < data.length; i += step) indices.push(i)
    if (indices[indices.length - 1] !== data.length - 1) indices.push(data.length - 1)
    return indices.map(i => ({
      i, x: xAt(i),
      label: (() => { try { return new Date(data[i].date).toLocaleDateString('en', { month: 'short', day: 'numeric' }) } catch { return data[i].date } })()
    }))
  })
</script>

<div class="areachart-wrap">
  <svg viewBox="0 0 {W} {H}" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Area chart">
    <defs>
      <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color={color} stop-opacity="0.35"/>
        <stop offset="100%" stop-color={color} stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    <!-- Grid lines -->
    {#each yTicks() as tick}
      <line x1={PADDING.left} y1={tick.y} x2={PADDING.left + innerW} y2={tick.y}
        stroke="#3a3530" stroke-width="0.5" stroke-dasharray="3 3"/>
      <text x={PADDING.left - 6} y={tick.y + 4} font-size="9" fill="#8a7f78" text-anchor="end">{tick.label}</text>
    {/each}
    <!-- Axes -->
    <line x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={PADDING.top + innerH} stroke="#3a3530" stroke-width="1"/>
    <line x1={PADDING.left} y1={PADDING.top + innerH} x2={PADDING.left + innerW} y2={PADDING.top + innerH} stroke="#3a3530" stroke-width="1"/>
    <!-- Area fill -->
    {#if filled && areaPath}
      <path d={areaPath} fill="url(#{gradId})"/>
    {/if}
    <!-- Line -->
    {#if linePath}
      <path d={linePath} fill="none" stroke={color} stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
    {/if}
    <!-- Data points — show on hover -->
    {#each points as pt, i}
      <circle
        cx={pt.x} cy={pt.y} r={hoveredIdx === i ? 4 : 2.5}
        fill={hoveredIdx === i ? color : '#252220'}
        stroke={color} stroke-width="1.5"
        style="transition: r 0.15s, fill 0.15s; cursor: pointer"
        on:mouseenter={() => { hoveredIdx = i }}
        on:mouseleave={() => { hoveredIdx = -1 }}
        role="graphics-symbol"
        aria-label="{pt.date}: {pt.value}"
      />
    {/each}
    <!-- Tooltip -->
    {#if hoveredIdx >= 0 && points[hoveredIdx]}
      {@const pt = points[hoveredIdx]}
      {@const d = data[hoveredIdx]}
      {@const tx = Math.min(Math.max(pt.x - 40, 2), W - 82)}
      {@const ty = Math.max(pt.y - 28, 4)}
      <rect x={tx} y={ty} width="80" height="20" rx="3" fill="#1a1816" stroke="#3a3530" stroke-width="1"/>
      <text x={tx + 40} y={ty + 13} font-size="9" fill="#c8bdb6" text-anchor="middle">{d.value}</text>
    {/if}
    <!-- X labels -->
    {#each xLabels() as lbl}
      <text x={lbl.x} y={PADDING.top + innerH + 14} font-size="8" fill="#8a7f78" text-anchor="middle">{lbl.label}</text>
    {/each}
  </svg>
</div>

<style>
  .areachart-wrap { width: 100%; }
  svg { display: block; }
</style>
