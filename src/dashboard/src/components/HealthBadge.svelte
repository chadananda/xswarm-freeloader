<script>
  let { status = 'unknown', size = 'sm' } = $props()

  const map = {
    healthy: { color: 'bg-green-600', label: 'healthy', text: 'text-green-700' },
    degraded: { color: 'bg-yellow-500', label: 'degraded', text: 'text-yellow-700' },
    down: { color: 'bg-red-500', label: 'down', text: 'text-red-700' },
    unknown: { color: 'bg-gray-400', label: 'unknown', text: 'text-gray-500' }
  }

  const info = $derived(map[status] || map.unknown)
  const dotSize = $derived(size === 'sm' ? 'w-2 h-2' : 'w-3 h-3')
</script>

<span class="inline-flex items-center gap-1.5">
  <span class="rounded-full {dotSize} {info.color}"></span>
  <span class="text-xs {info.text}">{info.label}</span>
</span>
