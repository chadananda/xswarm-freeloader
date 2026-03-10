<script>
  // :arch: pure SVG donut chart using stroke-dasharray/dashoffset segments
  // :why: zero deps; hover highlight; center total; legend below
  // :rules: segments=[{label,value,color}]; size prop for SVG dims; responsive
  let { segments = [], size = 200 } = $props()

  let hoveredIdx = $state(-1)

  const total = $derived(segments.reduce((s, d) => s + d.value, 0))
  const cx = $derived(size / 2)
  const cy = $derived(size / 2)
  const r = $derived(size * 0.32)
  const circumference = $derived(2 * Math.PI * r)
  const strokeW = $derived(size * 0.13)

  // Build segments: each gets dasharray offset from cumulative offset
  const segs = $derived(() => {
    let cumulative = 0
    return segments.map((seg, i) => {
      const frac = total > 0 ? seg.value / total : 0
      const dash = frac * circumference
      const gap = circumference - dash
      const offset = circumference - cumulative * circumference / (total || 1) * total / (total || 1)
      // simpler: offset by cumulative fraction
      const dashOffset = circumference * (1 - cumulative / (total || 1))
      cumulative += seg.value
      return { ...seg, dash, gap, dashOffset, frac, i }
    })
  })

  function formatTotal(n) {
    if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n/1000).toFixed(1)}k`
    return n % 1 === 0 ? String(n) : n.toFixed(2)
  }
</script>

<div class="donut-wrap">
  <svg width={size} height={size} viewBox="0 0 {size} {size}" style="display:block;margin:0 auto" role="img" aria-label="Donut chart">
    <!-- Background ring -->
    <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2e2a27" stroke-width={strokeW}/>
    <!-- Segments — rotate so first starts at top (-90deg = -PI/2) -->
    <g transform="rotate(-90 {cx} {cy})">
      {#each segs() as seg}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={seg.color || '#27864a'}
          stroke-width={hoveredIdx === seg.i ? strokeW * 1.15 : strokeW}
          stroke-dasharray="{seg.dash} {seg.gap}"
          stroke-dashoffset={-seg.dashOffset + circumference}
          style="transition: stroke-width 0.2s; cursor: pointer; opacity: {hoveredIdx < 0 || hoveredIdx === seg.i ? 1 : 0.5}"
          on:mouseenter={() => { hoveredIdx = seg.i }}
          on:mouseleave={() => { hoveredIdx = -1 }}
          role="graphics-symbol"
          aria-label="{seg.label}: {seg.value}"
        />
      {/each}
    </g>
    <!-- Center text -->
    <text x={cx} y={cy - 6} text-anchor="middle" font-size={size * 0.1} fill="#c8bdb6" font-weight="bold">
      {hoveredIdx >= 0 && segments[hoveredIdx] ? formatTotal(segments[hoveredIdx].value) : formatTotal(total)}
    </text>
    <text x={cx} y={cy + 10} text-anchor="middle" font-size={size * 0.065} fill="#8a7f78">
      {hoveredIdx >= 0 && segments[hoveredIdx] ? segments[hoveredIdx].label : 'total'}
    </text>
  </svg>
  <!-- Legend -->
  {#if segments.length > 0}
    <div class="donut-legend">
      {#each segments as seg, i}
        <div
          class="legend-item"
          style="opacity: {hoveredIdx < 0 || hoveredIdx === i ? 1 : 0.45}"
          on:mouseenter={() => { hoveredIdx = i }}
          on:mouseleave={() => { hoveredIdx = -1 }}
          role="presentation"
        >
          <span class="legend-dot" style="background:{seg.color || '#27864a'}"></span>
          <span class="legend-label">{seg.label}</span>
          <span class="legend-val">{total > 0 ? `${((seg.value/total)*100).toFixed(1)}%` : '—'}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .donut-wrap { width: 100%; }
  .donut-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 0.75rem;
    margin-top: 0.75rem;
    justify-content: center;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    cursor: pointer;
    transition: opacity 0.2s;
    font-size: 0.75rem;
    color: #c8bdb6;
  }
  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .legend-label { color: #8a7f78; }
  .legend-val { font-weight: 600; color: #c8bdb6; }
</style>
