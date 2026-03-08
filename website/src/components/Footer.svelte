<footer class="paper-footer">
  <div class="paper-footer__back"></div>
  <div class="paper-footer__front"></div>
  <div class="paper-footer__grain"></div>
  <div class="paper-footer__inner max-w-5xl mx-auto py-16 px-4">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
      <div class="col-span-2 md:col-span-1">
        <div class="font-heading text-2xl mb-3 flex items-center gap-1">
          <span class="text-savings">$</span><span class="text-ink">freeloader</span>
        </div>
        <p class="font-typewriter text-sm text-faded leading-relaxed">
          Your AI provider's worst nightmare.<br>Free forever. MIT licensed.
        </p>
      </div>
      <div>
        <h4 class="font-heading text-xs text-faded tracking-wider uppercase mb-4">Product</h4>
        <ul class="space-y-2.5 text-sm font-typewriter text-ink">
          <li><a href="/catalog" class="hover:text-coupon transition-colors">Model Catalog</a></li>
          <li><a href="/docs" class="hover:text-coupon transition-colors">Documentation</a></li>
          <li><a href="/docs#config" class="hover:text-coupon transition-colors">Configuration</a></li>
        </ul>
      </div>
      <div>
        <h4 class="font-heading text-xs text-faded tracking-wider uppercase mb-4">Community</h4>
        <ul class="space-y-2.5 text-sm font-typewriter text-ink">
          <li><a href="https://github.com/chadananda/xswarm-freeloader" target="_blank" rel="noopener" class="hover:text-coupon transition-colors">GitHub</a></li>
          <li><a href="https://github.com/chadananda/xswarm-freeloader/issues" target="_blank" rel="noopener" class="hover:text-coupon transition-colors">Issues</a></li>
        </ul>
      </div>
      <div>
        <h4 class="font-heading text-xs text-faded tracking-wider uppercase mb-4">xSwarm</h4>
        <ul class="space-y-2.5 text-sm font-typewriter text-ink">
          <li><a href="https://xswarm.ai" target="_blank" rel="noopener" class="hover:text-coupon transition-colors">xSwarm.ai</a></li>
          <li><a href="https://buzz.xswarm.ai" target="_blank" rel="noopener" class="hover:text-coupon transition-colors">xSwarm Buzz</a></li>
          <li><span class="text-faded">MIT License</span></li>
        </ul>
      </div>
    </div>
    <div class="mt-10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4" style="border-top: 1px solid rgba(180,170,155,0.3);">
      <p class="font-typewriter text-xs text-faded">be a freeloader: <span class="text-savings">npx freeloader.xswarm.ai</span></p>
      <p class="font-typewriter text-xs text-faded">&copy; 2025 xswarm. Open source forever.</p>
    </div>
  </div>
</footer>

<style>
  .paper-footer { position: relative; overflow: visible; }

  .paper-footer__back, .paper-footer__front {
    position: absolute; top: -2px; left: 0; right: 0; bottom: 0;
    background-color: #f0ebe0;
    background-image: var(--paper-surface);
    background-size: 200px, 100%; background-repeat: repeat, no-repeat;
    background-blend-mode: multiply;
    filter: url(#footercut);
    box-shadow: var(--shadow-contact);
  }
  .paper-footer__back {
    transform: translateY(-1px);
    filter: url(#footercut) drop-shadow(0 0 4px rgba(30,20,10,0.22)) drop-shadow(0 0 8px rgba(30,20,10,0.08));
  }
  .paper-footer__front { z-index: 1; }
  .paper-footer__grain {
    position: absolute; top: -2px; left: 0; right: 0; bottom: 0;
    pointer-events: none; z-index: 2;
    background-image: var(--noise-grain);
    background-size: 300px; background-repeat: repeat;
    mix-blend-mode: multiply; opacity: 0.7;
  }
  .paper-footer__inner { position: relative; z-index: 3; }
</style>
