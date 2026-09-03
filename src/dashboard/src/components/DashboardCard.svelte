<script>
  let { title, subtitle = '', accent = 'green' } = $props()
  const accentColors = { green: '#27864a', orange: '#d4831a', blue: '#4a6fa8' }
  const accentColor = $derived(accentColors[accent] || accentColors.green)
</script>

<div class="dashboard-card" style="--accent:{accentColor}">
  <div class="card-grain"></div>
  <div class="card-inner">
    {#if title}
      <div class="card-header">
        <h3 class="card-title">{title}</h3>
        {#if subtitle}<span class="card-subtitle">{subtitle}</span>{/if}
      </div>
    {/if}
    <div class="card-content">
      <slot />
    </div>
  </div>
</div>

<style>
  .dashboard-card {
    position: relative;
    background: #f0ebe0;
    border: 1px solid #d4cdc4;
    border-radius: 6px;
    box-shadow: 0 1px 2px rgba(30,20,10,0.06), 0 2px 6px rgba(30,20,10,0.04);
    overflow: hidden;
  }
  .card-grain {
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.12' numOctaves='2' stitchTiles='stitch' seed='11'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.12'/%3E%3C/svg%3E");
    background-size: 300px;
    pointer-events: none;
    opacity: 0.5;
    mix-blend-mode: multiply;
  }
  .card-inner {
    position: relative;
    padding: 1rem 1.25rem;
  }
  .card-header {
    margin-bottom: 0.75rem;
    border-bottom: 1px solid #d4cdc4;
    padding-bottom: 0.5rem;
  }
  .card-title {
    font-family: 'Permanent Marker', cursive;
    font-size: 1rem;
    color: var(--accent);
    margin: 0;
    line-height: 1.2;
  }
  .card-subtitle {
    font-size: 0.8rem;
    color: #8b8579;
    display: block;
    margin-top: 0.2rem;
  }
  .card-content {
    color: #2d2a26;
  }
</style>
