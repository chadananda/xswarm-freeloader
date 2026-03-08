<script lang="ts">
  import { onMount } from 'svelte';
  let menuOpen = false;
  let logoPrompt = '$\u00A0';
  let logoCmd = 'npx xswarm-freeloader';
  let cursorVisible = true;

  const navItems = [
    { name: 'Catalog', href: '/catalog' },
    { name: 'Docs', href: '/docs' },
    { name: 'GitHub', href: 'https://github.com/chadananda/xswarm-freeloader', external: true },
  ];

  onMount(() => {
    const cursorInterval = setInterval(() => cursorVisible = !cursorVisible, 530);
    const commands = ['npx xswarm-freeloader', 'freeloader.xswarm.ai'];
    let textIndex = 0;
    let charIndex = commands[0].length;
    let isDeleting = false;
    let timeout;
    function tick() {
      const cmd = commands[textIndex];
      if (isDeleting) {
        charIndex--;
        logoCmd = cmd.substring(0, charIndex);
        if (charIndex === 0) { isDeleting = false; textIndex = (textIndex + 1) % commands.length; timeout = setTimeout(tick, 400); }
        else { timeout = setTimeout(tick, 40); }
      } else {
        charIndex++;
        logoCmd = commands[textIndex].substring(0, charIndex);
        if (charIndex === commands[textIndex].length) { isDeleting = true; timeout = setTimeout(tick, 3000); }
        else { timeout = setTimeout(tick, 80); }
      }
    }
    timeout = setTimeout(() => { isDeleting = true; tick(); }, 2500);
    return () => { clearInterval(cursorInterval); clearTimeout(timeout); };
  });
</script>

<nav class="paper-nav">
  <div class="paper-nav__back"></div>
  <div class="paper-nav__front"></div>
  <div class="paper-nav__grain"></div>
  <div class="paper-nav__inner max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
    <a href="/" class="flex items-center gap-3 no-underline">
      <img src="/xswarm.svg" alt="xSwarm" class="nav-logo" />
      <span class="logo-terminal">
        <span class="logo-prompt">{logoPrompt}</span><span class="logo-cmd">{logoCmd}</span><span class="cursor">{cursorVisible ? '_' : '\u00A0'}</span>
      </span>
    </a>
    <div class="hidden md:flex items-center gap-7">
      {#each navItems as item}
        <a href={item.href} class="nav-link" target={item.external ? '_blank' : undefined} rel={item.external ? 'noopener' : undefined}>{item.name}</a>
      {/each}
      <a href="/docs#install" class="free-paper">Free</a>
    </div>
    <button class="md:hidden p-2 hamburger" on:click={() => menuOpen = !menuOpen}>
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {#if menuOpen}
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        {:else}
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        {/if}
      </svg>
    </button>
  </div>
  {#if menuOpen}
    <div class="md:hidden mobile-menu px-4 pb-4 flex flex-col gap-3 pt-3">
      {#each navItems as item}
        <a href={item.href} class="nav-link" target={item.external ? '_blank' : undefined} rel={item.external ? 'noopener' : undefined} on:click={() => menuOpen = false}>{item.name}</a>
      {/each}
      <a href="/docs#install" class="free-btn text-center" on:click={() => menuOpen = false}>Free</a>
    </div>
  {/if}
</nav>

<style>
  .paper-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 50; overflow: visible; }

  .paper-nav__back, .paper-nav__front {
    position: absolute; top: 0; left: 0; right: 0; bottom: -2px;
    background-color: #f0ebe0;
    background-image: var(--paper-surface);
    background-size: 200px, 100%; background-repeat: repeat, no-repeat;
    background-blend-mode: multiply;
    filter: url(#navcut);
    box-shadow: var(--shadow-contact);
  }
  .paper-nav__back {
    transform: translateY(1px);
    filter: url(#navcut) drop-shadow(0 0 4px rgba(30,20,10,0.22)) drop-shadow(0 0 8px rgba(30,20,10,0.08));
  }
  .paper-nav__front { z-index: 1; }
  .paper-nav__grain {
    position: absolute; top: 0; left: 0; right: 0; bottom: -2px;
    pointer-events: none; z-index: 2;
    background-image: var(--noise-grain);
    background-size: 300px; background-repeat: repeat;
    mix-blend-mode: multiply; opacity: 0.7;
  }
  .paper-nav__inner { position: relative; z-index: 3; }

  .nav-logo { height: 40px; width: 40px; transition: transform 0.3s ease; }
  .nav-logo:hover { transform: scale(1.05); }
  .logo-terminal {
    font-family: 'Special Elite', monospace; font-size: 18px; text-decoration: none;
    display: flex; align-items: center; color: #2d2a26;
    text-shadow: 0 1px 0 rgba(255,255,255,0.5);
  }
  .logo-prompt { color: #8b8579; }
  .logo-cmd { color: #2d2a26; }
  .cursor { color: #2d2a26; margin-left: 2px; }
  .nav-link {
    font-family: 'Special Elite', monospace; font-size: 15px; color: #5a5550;
    text-decoration: none; transition: color 0.2s ease;
    text-shadow: 0 1px 0 rgba(255,255,255,0.5);
  }
  .nav-link:hover { color: #2d2a26; }

  .free-paper {
    position: relative; font-family: 'Permanent Marker', cursive; font-size: 14px;
    letter-spacing: 0.03em; color: #c0392b; text-decoration: none;
    text-shadow: -1px 0 0 rgba(255,255,255,0.25), 1px 0 0 rgba(0,0,0,0.08);
    padding: 0.3rem 0.9rem; border-radius: 3px;
    background-color: #e4d6d4;
    background-image: var(--noise-fine);
    background-size: 182px; background-repeat: repeat; background-blend-mode: multiply;
    filter: url(#navcut) drop-shadow(0 0 2px rgba(30,20,10,0.18));
    box-shadow: inset 1px 1px 0 rgba(255,255,255,0.3), inset -1px -1px 0 rgba(0,0,0,0.05);
    transform: rotate(-2deg); transition: transform 0.15s ease;
  }
  .free-paper:hover { transform: rotate(-2deg) translate(-0.5px, -0.5px); }
  .free-paper:active { transform: rotate(-2deg) translate(0.5px, 0.5px); }
  .hamburger { color: #8b8579; transition: color 0.2s ease; }
  .hamburger:hover { color: #2d2a26; }
  .mobile-menu { position: relative; z-index: 1; border-top: 1px solid rgba(0,0,0,0.06); }
</style>
