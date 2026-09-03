<footer class="app-footer">
  <div class="footer-grain"></div>
  <div class="footer-inner">
    <span class="footer-bee">🐝</span>
    <span class="footer-text">xswarm freeloader v2.0 — Local AI router that maximizes free tier usage. Your keys never leave this machine.</span>
    <span class="footer-links">
      <a href="https://github.com/xswarm-ai/xswarm-freeloader" target="_blank">GitHub</a>
      <span class="footer-dot">·</span>
      <a href="https://freeloader.xswarm.ai" target="_blank">freeloader.xswarm.ai</a>
      <span class="footer-dot">·</span>
      <span>MIT Licensed</span>
    </span>
  </div>
</footer>

<style>
  .app-footer {
    position: relative;
    background: #e6ddd0;
    border-top: 1px solid #d4cdc4;
    margin: auto -1.5rem -1.5rem;
    padding: 0.75rem 1.5rem;
    overflow: hidden;
  }
  .footer-grain {
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.12' numOctaves='2' stitchTiles='stitch' seed='11'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.12'/%3E%3C/svg%3E");
    background-size: 300px;
    pointer-events: none;
    opacity: 0.4;
    mix-blend-mode: multiply;
  }
  .footer-inner {
    position: relative;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.4rem;
    font-size: 0.72rem;
    color: #a09789;
    font-family: 'Source Sans 3', sans-serif;
    line-height: 1.5;
  }
  .footer-bee { font-size: 0.85rem; margin-right: 0.1rem; }
  .footer-text { margin-right: 0.25rem; }
  .footer-links {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }
  .footer-links a {
    color: #8b8579;
    text-decoration: none;
    transition: color 0.15s;
  }
  .footer-links a:hover { color: #27864a; text-decoration: underline; }
  .footer-dot { color: #c8c0b5; }
  @media (max-width: 768px) {
    .app-footer {
      margin: auto -1rem -1rem;
      padding: 0.75rem 1rem;
    }
    .footer-inner {
      font-size: 0.68rem;
      justify-content: center;
      text-align: center;
    }
  }
</style>
