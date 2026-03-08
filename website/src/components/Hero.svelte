<script lang="ts">
  import { onMount } from 'svelte';
  import Terminal from './Terminal.svelte';

  function pick(arr: string[]) { return arr[Math.floor(Math.random() * arr.length)]; }

  let providerCount = 0;
  let modelCount = 0;
  let mounted = false;

  onMount(() => {
    mounted = true;
    const providerTarget = 20;
    const modelTarget = 60;
    let start = performance.now();
    function animate(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / 1800, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      providerCount = Math.round(providerTarget * ease);
      modelCount = Math.round(modelTarget * ease);
      if (progress < 1) requestAnimationFrame(animate);
    }
    setTimeout(() => requestAnimationFrame(animate), 600);
  });

  const asciiArt = [
    ' ███████╗██████╗ ███████╗███████╗',
    ' ██╔════╝██╔══██╗██╔════╝██╔════╝',
    ' █████╗  ██████╔╝█████╗  █████╗',
    ' ██╔══╝  ██╔══██╗██╔══╝  ██╔══╝',
    ' ██║     ██║  ██║███████╗███████╗',
    ' ╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝',
    ' ',
    ' ██╗      ██████╗  █████╗ ██████╗ ███████╗██████╗',
    ' ██║     ██╔═══██╗██╔══██╗██╔══██╗██╔════╝██╔══██╗',
    ' ██║     ██║   ██║███████║██║  ██║█████╗  ██████╔╝',
    ' ██║     ██║   ██║██╔══██║██║  ██║██╔══╝  ██╔══██╗',
    ' ███████╗╚██████╔╝██║  ██║██████╔╝███████╗██║  ██║',
    ' ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═╝',
  ];

  const subtitles = [
    'Your AI provider\'s worst nightmare.',
    'Be a freeloader: npx freeloader.xswarm.ai',
    'Making billionaires slightly less rich since 2025.',
    'Because "free tier" is our love language.',
    'Turning AI pricing pages into fiction.',
    'Budget status: aggressively zero.',
    'Corporate called. They want their margins back.',
    'All your free tiers are belong to us.',
  ];

  const descriptions = [
    'Freeloader is a local LLM proxy router that rotates requests around current',
    'free-tier offers in an attempt to reduce or wipe out your AI bill.',
  ];

  const subtitle = pick(subtitles);

  const quips = [
    'OpenAI\'s billing team hates this one weird trick.',
    'Somewhere, a pricing page is crying.',
    'Deploying economic warfare on your monthly AI spend.',
    'Providers hate him! Local dev saves $200/mo with one trick.',
    'Achievement unlocked: $0/month AI infrastructure.',
    'Free tiers assembled. Wallets closed. Vibes immaculate.',
  ];

  const lines = [
    { text: '$ npx xswarm-freeloader', color: 'cmd' },
    { text: '', color: '' },
    ...asciiArt.map(t => ({ text: t, color: 'banner' })),
    { text: '', color: '' },
    { text: `  "${subtitle}"`, color: 'quip' },
    { text: '', color: '' },
    ...descriptions.map(t => ({ text: `  ${t}`, color: 'out' })),
    { text: '', color: '' },
    { text: '  ✓ Setting up...', color: 'check' },
    { text: '      Created ~/.xswarm/', color: 'out' },
    { text: '      SQLite database initialized (WAL mode)', color: 'out' },
    { text: '      pm2 process manager ready', color: 'out' },
    { text: '', color: '' },
    { text: '  ✓ Daily savings digest', color: 'check' },
    { text: '      Email (enter to skip): dev@example.com', color: 'key' },
    { text: '      Digest configured', color: 'out' },
    { text: '', color: '' },
    { text: '  ✓ Scanning for local models...', color: 'check' },
    { text: '      Ollama detected — 3 models (llama3.2, mistral, phi3)', color: 'out' },
    { text: '      Local models added to private trust tier', color: 'out' },
    { text: '', color: '' },
    { text: '  ✓ Provider catalog synced', color: 'check' },
    { text: '      Gemini ............ 3 free models', color: 'out' },
    { text: '      Groq .............. 8 free models', color: 'out' },
    { text: '      Cerebras .......... 4 free models', color: 'out' },
    { text: '      Mistral ........... 2 free models', color: 'out' },
    { text: '      SambaNova ......... 6 free models', color: 'out' },
    { text: '      OpenRouter ....... 27 free models', color: 'out' },
    { text: '      Ollama ............ 3 local models', color: 'out' },
    { text: '      DeepSeek, Alibaba, Together (budget fallback)', color: 'out' },
    { text: '      OpenAI, Anthropic (premium fallback)', color: 'out' },
    { text: '      Free first → lowest cost next → premium last', color: 'check' },
    { text: '', color: '' },
    { text: '  ✓ Router → http://localhost:4011', color: 'check' },
    { text: '  ✓ Dashboard → http://localhost:4010', color: 'check' },
    { text: '', color: '' },
    { text: '  Set up free-tier providers in your private dashboard:', color: 'out' },
    { text: '  http://localhost:4010', color: 'key' },
    { text: '', color: '' },
    { text: `  ${pick(quips)}`, color: 'quip' },
  ];

  let t = 400;
  const delays: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    delays.push(t);
    const ln = lines[i];
    if (i === 0) { t += 500; }
    else if (ln.color === 'banner') { t += 60; }
    else if (ln.color === 'quip' && i < 10) { t += 600; }
    else if (ln.text.includes('Setting up')) { t += 400; }
    else if (ln.color === 'check') { t += 280; }
    else if (ln.text.includes('┌') || ln.text.includes('├') || ln.text.includes('└')) { t += 80; }
    else if (ln.text.includes('│')) { t += 120; }
    else if (ln.text === '') { t += 100; }
    else { t += 300; }
  }
</script>

<section class="relative min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-16 overflow-hidden">
  <div class="relative max-w-5xl w-full">
    <div class="text-center mb-16">
      <div class="inline-block mb-10" style="transform: rotate(-1.5deg);">
        <div class="hero-badge">
          <div class="hero-badge__back"></div>
          <div class="hero-badge__front">
            <div class="hero-card__grain"></div>
          </div>
          <span class="hero-badge__text">COMING SOON</span>
        </div>
      </div>

      <div class="flex items-center justify-center gap-6 sm:gap-12 mb-10">
        <!-- Provider count -->
        <div class="hero-card" style="transform: rotate(-2deg);">
          <div class="hero-card__back"></div>
          <div class="hero-card__front">
            <div class="hero-card__grain"></div>
          </div>
          <div class="hero-card__content">
            <div class="font-heading text-5xl sm:text-6xl text-ink leading-none text-center">
              {mounted ? providerCount : 20}+
            </div>
            <div class="font-typewriter text-xs text-faded mt-2 tracking-wider uppercase text-center">providers</div>
          </div>
        </div>

        <div class="text-4xl sm:text-5xl select-none" style="color: #c4b8a0;">/</div>

        <!-- Model count -->
        <div class="hero-card" style="transform: rotate(1.5deg);">
          <div class="hero-card__back"></div>
          <div class="hero-card__front">
            <div class="hero-card__grain"></div>
          </div>
          <div class="hero-card__content">
            <div class="font-heading text-5xl sm:text-6xl text-ink leading-none text-center">
              {mounted ? modelCount : 60}+
            </div>
            <div class="font-typewriter text-xs text-faded mt-2 tracking-wider uppercase text-center">models</div>
          </div>
        </div>

        <div class="text-4xl sm:text-5xl select-none" style="color: #c4b8a0;">/</div>

        <!-- $0 cost tag -->
        <div class="hero-card hero-card--green" style="transform: rotate(-1deg);">
          <div class="hero-card__back hero-card__back--green"></div>
          <div class="hero-card__front hero-card__front--green">
            <div class="hero-card__grain"></div>
          </div>
          <div class="hero-card__content">
            <div class="font-heading text-6xl sm:text-7xl leading-none text-center" style="color: #27864a;">$0</div>
            <div class="font-typewriter text-xs text-faded mt-2 tracking-wider uppercase text-center">monthly cost</div>
          </div>
        </div>
      </div>

      <h1 class="font-heading text-4xl sm:text-6xl lg:text-7xl leading-[1.15] mb-6 tracking-tight">
        <span class="text-ink">Free AI is everywhere.</span><br>
        <span class="text-ink">Nobody's using it all.</span>
      </h1>

      <p class="font-typewriter text-lg sm:text-xl text-faded max-w-3xl mx-auto leading-relaxed">
        Gemini, Groq, Mistral, Cerebras, SambaNova, OpenRouter — dozens of providers offer free tiers.
        When those run out, DeepSeek and Alibaba charge fractions of a cent.
        <span class="text-ink font-heading">Freeloader exhausts every free tier first, then routes to the cheapest option.</span>
      </p>
    </div>

    <div class="max-w-3xl mx-auto mb-12">
      <Terminal {lines} {delays} />
    </div>

    <div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 font-typewriter text-sm text-faded">
      {#each [
        { label: 'OpenAI-compatible API', rot: '-0.5deg' },
        { label: 'Works with any SDK', rot: '0.8deg' },
        { label: 'MIT licensed', rot: '-0.3deg' },
        { label: 'Self-hosted & private', rot: '0.6deg' },
      ] as badge}
        <div class="hero-chip" style="transform: rotate({badge.rot});">
          <div class="hero-chip__back"></div>
          <div class="hero-chip__front">
            <div class="hero-card__grain"></div>
          </div>
          <span class="hero-chip__text">
            <span style="color: #27864a; font-weight: bold;">&#10003;</span> {badge.label}
          </span>
        </div>
      {/each}
    </div>
  </div>
</section>

<style>
  :global(.hero-card__grain) {
    position: absolute; inset: 0; pointer-events: none;
    background-image: var(--noise-grain); background-size: 300px; background-repeat: repeat;
    mix-blend-mode: multiply; opacity: 0.7; border-radius: inherit;
  }

  .hero-card { position: relative; min-width: 100px; }
  .hero-card__back, .hero-card__front {
    position: absolute; inset: 0; background-color: #f0ebe0;
    background-image: var(--paper-surface); background-size: 200px, 100%;
    background-repeat: repeat, no-repeat; background-blend-mode: multiply;
    border-radius: 3px 4px 5px 4px; filter: url(#herocut);
    box-shadow: var(--shadow-contact), var(--shadow-edge);
  }
  .hero-card__back {
    transform: translate(1px, 1px);
    filter: url(#herocut) drop-shadow(0 0 4px rgba(30,20,10,0.22)) drop-shadow(0 0 8px rgba(30,20,10,0.08));
  }
  .hero-card__front { z-index: 1; }
  .hero-card__back--green, .hero-card__front--green { background-color: #d8e0d2; }
  .hero-card__content { position: relative; z-index: 2; padding: 1.2rem 1.2rem 0.9rem; }

  .hero-badge { position: relative; display: inline-block; }
  .hero-badge__back, .hero-badge__front {
    position: absolute; inset: 0; background-color: #e6ddd0;
    background-image: var(--paper-surface); background-size: 200px, 100%;
    background-repeat: repeat, no-repeat; background-blend-mode: multiply;
    border-radius: 3px; filter: url(#herocut); box-shadow: var(--shadow-contact);
  }
  .hero-badge__back {
    transform: translate(1px, 1px);
    filter: url(#herocut) drop-shadow(0 0 3px rgba(30,20,10,0.18));
  }
  .hero-badge__front { z-index: 1; }
  .hero-badge__text {
    position: relative; z-index: 2; display: block;
    font-family: 'Permanent Marker', cursive; font-size: 0.8rem;
    letter-spacing: 0.12em; color: #d4831a; padding: 0.35rem 1rem;
    text-shadow: -1px 0 0 rgba(255,255,255,0.25), 1px 0 0 rgba(0,0,0,0.08);
  }

  .hero-chip { position: relative; display: inline-flex; align-items: center; }
  .hero-chip__back, .hero-chip__front {
    position: absolute; inset: 0; background-color: #f0ebe0;
    background-image: var(--paper-surface); background-size: 200px, 100%;
    background-repeat: repeat, no-repeat; background-blend-mode: multiply;
    border-radius: 3px; filter: url(#herocut); box-shadow: var(--shadow-contact);
  }
  .hero-chip__back {
    transform: translate(1px, 1px);
    filter: url(#herocut) drop-shadow(0 0 2px rgba(30,20,10,0.15));
  }
  .hero-chip__front { z-index: 1; }
  .hero-chip__text {
    position: relative; z-index: 2; font-family: 'Special Elite', monospace;
    font-size: 0.8rem; color: #8b8579; padding: 0.2rem 0.7rem;
    display: inline-flex; align-items: center; gap: 0.35rem;
    text-shadow: 0 1px 0 rgba(255,255,255,0.5);
  }
</style>
