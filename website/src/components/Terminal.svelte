<script lang="ts">
  import { onMount } from 'svelte';

  export let lines: { text: string; color: string }[] = [];
  export let delays: number[] = [];

  let visibleCount = 0;
  let cursorVisible = true;
  let done = false;

  onMount(() => {
    const cursorInterval = setInterval(() => cursorVisible = !cursorVisible, 530);
    delays.forEach((delay, i) => {
      setTimeout(() => {
        visibleCount = i + 1;
        if (i === delays.length - 1) {
          setTimeout(() => { done = true; }, 800);
        }
      }, delay);
    });
    return () => clearInterval(cursorInterval);
  });
</script>

<div class="printout-wrap">
  <!-- tape corners (outside paper so clip-path doesn't clip them) -->
  <div class="tape tape-tl" aria-hidden="true"></div>
  <div class="tape tape-tr" aria-hidden="true"></div>

  <!-- left tractor-feed strip -->
  <div class="feed-strip feed-left" aria-hidden="true"></div>

  <div class="printout-paper">
    <!-- Torn top edge -->
    <div class="torn-top-edge" aria-hidden="true">
      <svg viewBox="0 0 800 20" preserveAspectRatio="none">
        <path d="M0,20 L800,20 L800,5 C790,7 782,3 772,5 C762,7 752,3 742,6 C732,8 722,3 712,5 C702,7 692,3 682,6 C672,8 662,3 652,5 C642,7 632,3 622,6 C612,8 602,3 592,5 C582,7 572,3 562,6 C552,8 542,3 532,5 C522,7 512,3 502,6 C492,8 482,3 472,5 C462,7 452,3 442,6 C432,8 422,3 412,5 C402,7 392,3 382,6 C372,8 362,3 352,5 C342,7 332,3 322,6 C312,8 302,3 292,5 C282,7 272,3 262,6 C252,8 242,3 232,5 C222,7 212,3 202,6 C192,8 182,3 172,5 C162,7 152,3 142,6 C132,8 122,3 112,5 C102,7 92,3 82,6 C72,8 62,3 52,5 C42,7 32,3 22,6 C12,8 5,4 0,6 Z" fill="#e2ede2"/>
      </svg>
    </div>
    <!-- header bar -->
    <div class="printout-header">
      <div class="header-dots">
        <span class="hdot hdot-r"></span>
        <span class="hdot hdot-y"></span>
        <span class="hdot hdot-g"></span>
      </div>
      <span class="header-label">Terminal — freeloader</span>
    </div>

    <div class="printout-body">
      {#each lines as line, i}
        <div
          class="pline pline-{line.color || 'out'}"
          class:fresh={i === visibleCount - 1 && i > 0}
          class:invisible={i >= visibleCount}
        >{line.text || '\u00A0'}</div>
      {/each}
      {#if !done}
        <div class="cursor-line">
          <span class="block-cursor" class:on={cursorVisible}></span>
        </div>
      {/if}
    </div>
  </div>

  <!-- right tractor-feed strip -->
  <div class="feed-strip feed-right" aria-hidden="true"></div>
</div>

<style>
  .printout-wrap {
    display: flex;
    align-items: stretch;
    transform: rotate(-0.8deg);
    transform-origin: 50% 20%;
    position: relative;
    filter: drop-shadow(0 4px 12px rgba(0,0,0,0.12))
            drop-shadow(0 1px 3px rgba(0,0,0,0.08));
  }

  /* ── tractor-feed strips ──────────────────────────────────────────── */
  .feed-strip {
    width: 26px;
    flex-shrink: 0;
    background: #ebe6dc;
    position: relative;
    overflow: hidden;
  }
  .feed-strip::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, rgba(180,170,155,0.5) 3.5px, transparent 3.5px);
    background-size: 26px 20px;
    background-position: center 3px;
  }
  .feed-left { border-right: 1px dashed #ccc5b8; }
  .feed-right { border-left: 1px dashed #ccc5b8; }

  /* ── paper ─────────────────────────────────────────────────────────── */
  .printout-paper {
    flex: 1;
    position: relative;
    overflow: visible;
    background: #fffdf7;
  }

  .torn-top-edge {
    position: relative;
    line-height: 0;
    margin-top: -5px;
    margin-bottom: -1px;
  }
  .torn-top-edge svg {
    display: block;
    width: 100%;
    height: 8px;
  }
  /* green bar stripes */
  .printout-paper::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      to bottom,
      rgba(200, 230, 205, 0.45) 0px,
      rgba(200, 230, 205, 0.45) 26px,
      transparent 26px,
      transparent 52px
    );
    pointer-events: none;
    z-index: 0;
  }

  /* ── tape corners ──────────────────────────────────────────────────── */
  .tape {
    position: absolute;
    width: 52px;
    height: 18px;
    background: rgba(245, 230, 163, 0.55);
    border: 1px solid rgba(210, 195, 130, 0.3);
    z-index: 10;
    pointer-events: none;
  }
  .tape-tl { top: -10px; left: 50px; transform: rotate(-6deg); }
  .tape-tr { top: -10px; right: 50px; transform: rotate(5deg); }

  /* ── header ────────────────────────────────────────────────────────── */
  .printout-header {
    position: relative;
    z-index: 5;
    padding: 22px 1.5rem 8px;
    border-bottom: 1px dashed #d4c5a9;
    display: flex;
    align-items: center;
    gap: 6px;
    user-select: none;
  }
  .header-dots {
    display: flex;
    gap: 5px;
  }
  .hdot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    opacity: 0.7;
  }
  .hdot-r { background: #e8735a; }
  .hdot-y { background: #ddb44b; }
  .hdot-g { background: #6aba6a; }
  .header-label {
    flex: 1;
    text-align: center;
    font-family: 'Special Elite', monospace;
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    color: #a09890;
  }

  /* ── body ───────────────────────────────────────────────────────────── */
  .printout-body {
    position: relative;
    z-index: 5;
    padding: 1.25rem 1.75rem 1.75rem;
    font-family: 'Special Elite', monospace;
    font-size: 0.78rem;
    line-height: 1.65;
    min-height: 200px;
    white-space: pre;
    overflow: hidden;
  }

  /* ── line base ──────────────────────────────────────────────────────── */
  .pline {
    min-height: 1.65em;
    white-space: pre;
    overflow: hidden;
  }
  .pline.fresh {
    animation: stamp 0.3s ease-out;
  }
  @keyframes stamp {
    0% { opacity: 0; transform: translateY(2px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  /* ── ink colors per line type ───────────────────────────────────────── */

  /* Command — blue ballpoint pen */
  .pline-cmd {
    color: #1a5276;
    font-weight: bold;
  }

  /* ASCII banner — monospace required for box-drawing alignment */
  .pline-banner {
    color: #2d2a26;
    font-family: 'Courier New', Courier, monospace;
    font-weight: bold;
    font-size: 0.62rem;
    line-height: 1.0;
    letter-spacing: 0;
    min-height: 0;
  }

  /* Check items — green ink (like a teacher's check marks) */
  .pline-check {
    color: #1e7a3f;
  }

  /* API key — highlighted with marker */
  .pline-key {
    color: #2d2a26;
    font-weight: bold;
    background: linear-gradient(to bottom, transparent 40%, rgba(245, 230, 163, 0.6) 40%, rgba(245, 230, 163, 0.6) 85%, transparent 85%);
    display: inline-block;
  }

  /* Closing quip — red pen, underlined by teacher */
  .pline-quip {
    color: #b5332e;
    font-weight: bold;
    font-style: italic;
    border-bottom: 2px solid rgba(181, 51, 46, 0.3);
    display: inline-block;
  }

  /* Default output — pencil gray */
  .pline-out {
    color: #9a9489;
  }

  .invisible { visibility: hidden; }

  /* ── cursor ─────────────────────────────────────────────────────────── */
  .cursor-line {
    height: 0;
    margin-top: -1.8em;
    position: relative;
    z-index: 6;
  }
  .block-cursor {
    display: inline-block;
    width: 0.55em;
    height: 1.1em;
    background: #2d2a26;
    vertical-align: text-bottom;
    opacity: 0;
    transition: opacity 0.05s;
  }
  .block-cursor.on {
    opacity: 1;
  }

  /* ── mobile ─────────────────────────────────────────────────────────── */
  @media (max-width: 639px) {
    .printout-wrap { transform: none; }
    .printout-body { font-size: 0.65rem; line-height: 1.5; padding: 0.8rem 0.75rem 1.25rem; min-height: 280px; white-space: pre-wrap; word-break: break-word; }
    .pline { white-space: pre-wrap; }
    .pline-banner { display: none; }
    .printout-header { padding: 16px 1rem 6px; }
    .feed-strip { width: 16px; }
    .feed-strip::after { background-size: 16px 18px; }
    .tape { width: 36px; height: 14px; }
  }
</style>
