<script>
  let { label, value, change = null, accent = 'blue', subtitle = '' } = $props()

  const accentMap = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400'
  }

  const changeColor = $derived(
    change === null ? '' :
    change > 0 ? 'text-green-400' :
    change < 0 ? 'text-red-400' : 'text-gray-400'
  )
  const changeLabel = $derived(
    change === null ? '' :
    change > 0 ? `+${change}%` :
    change < 0 ? `${change}%` : '0%'
  )
</script>

<div class="bg-gray-800 rounded-xl p-5 border border-gray-700">
  <div class="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</div>
  <div class="text-2xl font-bold {accentMap[accent] || 'text-white'}">{value}</div>
  {#if subtitle}<div class="text-xs text-gray-500 mt-1">{subtitle}</div>{/if}
  {#if change !== null}<div class="text-xs {changeColor} mt-1">{changeLabel} vs yesterday</div>{/if}
</div>
