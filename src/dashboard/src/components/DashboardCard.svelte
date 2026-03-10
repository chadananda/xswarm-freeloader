<script>
  // :arch: dark paper themed card with torn-edge SVG filter, replaces raw bg-gray-800 divs
  // :why: consistent paper aesthetic; SVG filter reference shared via hidden defs in parent or inline
  // :rules: accent only 'green'|'orange'|'blue'; slot for any content; no layout assumptions
  let { title, subtitle = '', accent = 'green' } = $props()
  const accentColors = { green: '#27864a', orange: '#d4831a', blue: '#4a6fa8' }
  const accentColor = $derived(accentColors[accent] || accentColors.green)
</script>

<svg width="0" height="0" style="position:absolute">
  <defs>
    <filter id="dashpapercut" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" seed="2" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="papergrain" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="turbulence" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" result="grain"/>
      <feColorMatrix type="saturate" values="0" in="grain" result="gray"/>
      <feBlend in="SourceGraphic" in2="gray" mode="overlay" result="blend"/>
      <feComposite in="blend" in2="SourceGraphic" operator="in"/>
    </filter>
  </defs>
</svg>

<div class="dashboard-card" style="--accent:{accentColor}" style:filter="url(#dashpapercut)">
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
  @import url('https://fonts.googleapis.com/css2?family=Permanent+Marker&family=Special+Elite&display=swap');
  .dashboard-card {
    position: relative;
    background: #252220;
    border: 1px solid #3a3530;
    border-radius: 12px;
    overflow: hidden;
  }
  .card-grain {
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E");
    background-size: 200px 200px;
    pointer-events: none;
    opacity: 0.4;
    mix-blend-mode: overlay;
  }
  .card-inner {
    position: relative;
    padding: 1rem 1.25rem;
  }
  .card-header {
    margin-bottom: 0.75rem;
    border-bottom: 1px solid #3a3530;
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
    font-family: 'Special Elite', serif;
    font-size: 0.75rem;
    color: #8a7f78;
    display: block;
    margin-top: 0.2rem;
  }
  .card-content {
    color: #c8bdb6;
  }
</style>
