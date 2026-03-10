<script>
  // :arch: pure SVG bar chart, no libs; animated on mount; hover tooltips
  // :why: zero deps, dark paper aesthetic with hand-drawn stroke variations
  // :rules: data = [{label,value,color}]; responsive via viewBox; CSS transitions for animation
  let { data = [], height = 200, showLabels = true } = $props()

  const PADDING = { top: 10, right: 10, bottom: showLabels ? 40 : 10, left: 40 }
  const W = 400
  const H = height

  let mounted = $state(false)
  let hoveredIdx = $state(-1)
  let tooltipPos = $state({ x: 0, y: 0 })

  const maxVal = $derived(Math.max(...data.map(d => d.value), 1))
  const innerW = $derived(W - PADDING.left - PADDING.right)
  const innerH = $derived(H - PADDING.top - PADDING.bottom)
  const barW = $derived(data.length ? (innerW / data.length) * 0.65 : 0)
  const barGap = $derived(data.length ? (innerW / data.length) * 0.35 : 0)

  // Y-axis labels
  const yTicks = $derived(() => {
    const count = 4
    return Array.from({ length: count + 1 }, (_, i) => {
      const val = (maxVal / count) * i
      const y = PADDING.top + innerH - (val / maxVal) * innerH
      return { val: val.toFixed(val < 1 ? 4 : 2), y }
    })
  })

  // stroke-dasharray variation for hand-drawn feel
  function dashVariation(idx) {
    const seed = idx * 7 + 3
    const v = ((seed * 13) % 5) / 10
    return `${1 + v} ${v * 0.5}`
  }

  import { onMount } from 'svelte'
  onMount(() => { setTimeout(() => { mounted = true }, 50) })

  function handleMouseMove(e, idx) {
    hoveredIdx = idx
    const rect = e.currentTarget.closest('svg').getBoundingClientRect()
    tooltipPos = { x: e.clientX - rect.left, y: e.clientY - rect.top - 10 }
  }
</script>

<div class="barchart-wrap">
  <svg viewBox="0 0 {W} {H}" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Bar chart">
    <!-- Y axis -->
    <line x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={PADDING.top + innerH}
      stroke="#3a3530" stroke-width="1"/>
    <!-- X axis -->
    <line x1={PADDING.left} y1={PADDING.top + innerH} x2={PADDING.left + innerW} y2={PADDING.top + innerH}
      stroke="#3a3530" stroke-width="1"/>
    <!-- Y ticks -->
    {#each yTicks() as tick}
      <line x1={PADDING.left - 4} y1={tick.y} x2={PADDING.left + innerW} y2={tick.y}
        stroke="#3a3530" stroke-width="0.5" stroke-dasharray="3 3"/>
      <text x={PADDING.left - 6} y={tick.y + 4} font-size="9" fill="#8a7f78" text-anchor="end">{tick.val}</text>
    {/each}
    <!-- Bars -->
    {#each data as bar, idx}
      {@const x = PADDING.left + idx * (barW + barGap) + barGap / 2}
      {@const barH = mounted ? (bar.value / maxVal) * innerH : 0}
      {@const y = PADDING.top + innerH - barH}
      <rect
        {x} {y}
        width={barW} height={barH}
        fill={bar.color || '#27864a'}
        fill-opacity="0.75"
        rx="2"
        stroke={bar.color || '#27864a'}
        stroke-width="1"
        stroke-dasharray={dashVariation(idx)}
        style="transition: height 0.6s ease {idx * 0.05}s, y 0.6s ease {idx * 0.05}s"
        on:mouseenter={(e) => handleMouseMove(e, idx)}
        on:mousemove={(e) => handleMouseMove(e, idx)}
        on:mouseleave={() => { hoveredIdx = -1 }}
        role="graphics-symbol"
        aria-label="{bar.label}: {bar.value}"
      />
      {#if showLabels}
        <text
          x={x + barW / 2} y={PADDING.top + innerH + 14}
          font-size="9" fill="#8a7f78" text-anchor="middle"
        >{bar.label}</text>
      {/if}
    {/each}
    <!-- Hover tooltip inside SVG -->
    {#if hoveredIdx >= 0 && data[hoveredIdx]}
      {@const d = data[hoveredIdx]}
      {@const tx = Math.min(tooltipPos.x, W - 70)}
      {@const ty = Math.max(tooltipPos.y - 30, 4)}
      <rect x={tx} y={ty} width="64" height="20" rx="3" fill="#1a1816" stroke="#3a3530" stroke-width="1"/>
      <text x={tx + 32} y={ty + 13} font-size="10" fill="#c8bdb6" text-anchor="middle">{d.label}: {d.value}</text>
    {/if}
  </svg>
</div>

<style>
  .barchart-wrap { width: 100%; }
  svg { display: block; }
</style>
