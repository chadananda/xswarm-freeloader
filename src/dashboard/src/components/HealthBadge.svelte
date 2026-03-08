<script>
  let { status = 'unknown', size = 'sm' } = $props()

  const map = {
    healthy: { color: 'bg-green-500', label: 'healthy', text: 'text-green-400' },
    degraded: { color: 'bg-yellow-500', label: 'degraded', text: 'text-yellow-400' },
    down: { color: 'bg-red-500', label: 'down', text: 'text-red-400' },
    unknown: { color: 'bg-gray-500', label: 'unknown', text: 'text-gray-400' }
  }

  const info = $derived(map[status] || map.unknown)
  const dotSize = $derived(size === 'sm' ? 'w-2 h-2' : 'w-3 h-3')
</script>

<span class="inline-flex items-center gap-1.5">
  <span class="rounded-full {dotSize} {info.color} animate-pulse"></span>
  <span class="text-xs {info.text}">{info.label}</span>
</span>
