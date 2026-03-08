<script lang="ts">
  export let provider: string;
  export let size: number = 20;

  function key(p: string): string {
    const n = p.toLowerCase();
    if (n.includes('gemini') || n === 'google') return 'gemini';
    if (n.includes('groq')) return 'groq';
    if (n.includes('cerebras')) return 'cerebras';
    if (n.includes('sambanova')) return 'sambanova';
    if (n.includes('mistral')) return 'mistral';
    if (n.includes('openrouter')) return 'openrouter';
    if (n.includes('xai') || n.includes('grok')) return 'xai';
    if (n.includes('openai')) return 'openai';
    if (n.includes('anthropic')) return 'anthropic';
    if (n.includes('together')) return 'together';
    if (n.includes('cohere')) return 'cohere';
    if (n.includes('alibaba') || n.includes('qwen')) return 'alibaba';
    if (n.includes('fireworks')) return 'fireworks';
    if (n.includes('deepseek')) return 'deepseek';
    if (n.includes('ollama') || n.includes('local') || n.includes('lm studio')) return 'ollama';
    if (n.includes('hugging')) return 'huggingface';
    if (n.includes('inception') || n.includes('mercury')) return 'inception';
    if (n.includes('nvidia') || n.includes('nim')) return 'nvidia';
    if (n.includes('github')) return 'github';
    if (n.includes('cloudflare')) return 'cloudflare';
    return 'generic';
  }

  $: k = key(provider);
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="currentColor"
  class="provider-icon"
  aria-label={provider}
>
  {#if k === 'gemini'}
    <!-- Gemini sparkle star -->
    <path d="M12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22C12 16.5 16.5 12 22 12C16.5 12 12 7.5 12 2Z"/>
  {:else if k === 'groq'}
    <!-- Groq - lightning bolt speed -->
    <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"/>
  {:else if k === 'cerebras'}
    <!-- Cerebras - wafer/chip grid -->
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
    <rect x="9" y="9" width="6" height="6" rx="1" opacity="0.5"/>
  {:else if k === 'sambanova'}
    <!-- SambaNova - stacked layers -->
    <path d="M4 17L12 21L20 17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M4 13L12 17L20 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M4 9L12 13L20 9L12 5L4 9Z"/>
  {:else if k === 'mistral'}
    <!-- Mistral - horizontal wind bars -->
    <rect x="3" y="4" width="18" height="3" rx="1.5"/>
    <rect x="6" y="10.5" width="15" height="3" rx="1.5"/>
    <rect x="3" y="17" width="18" height="3" rx="1.5"/>
  {:else if k === 'openrouter'}
    <!-- OpenRouter - routing arrows -->
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>
    <path d="M8 12H16M16 12L13 9M16 12L13 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  {:else if k === 'xai'}
    <!-- xAI Grok - X mark -->
    <path d="M4 4L10.5 12L4 20H7L12 13.5L17 20H20L13.5 12L20 4H17L12 10.5L7 4H4Z"/>
  {:else if k === 'openai'}
    <!-- OpenAI - hexagonal iris -->
    <path d="M12 2.5L3.5 7.25V16.75L12 21.5L20.5 16.75V7.25L12 2.5Z" fill="none" stroke="currentColor" stroke-width="1.8"/>
    <path d="M12 7L8 9.5V14.5L12 17L16 14.5V9.5L12 7Z" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="2"/>
  {:else if k === 'anthropic'}
    <!-- Anthropic - stylized A -->
    <path d="M12 3L4 21H8.5L10 17H14L15.5 21H20L12 3ZM11 14L12 10.5L13 14H11Z"/>
  {:else if k === 'together'}
    <!-- Together - connected nodes -->
    <circle cx="7" cy="7" r="2.5"/>
    <circle cx="17" cy="7" r="2.5"/>
    <circle cx="12" cy="17" r="2.5"/>
    <line x1="7" y1="9.5" x2="12" y2="14.5" stroke="currentColor" stroke-width="1.8"/>
    <line x1="17" y1="9.5" x2="12" y2="14.5" stroke="currentColor" stroke-width="1.8"/>
    <line x1="9.5" y1="7" x2="14.5" y2="7" stroke="currentColor" stroke-width="1.8"/>
  {:else if k === 'cohere'}
    <!-- Cohere - coral/brain nodes -->
    <circle cx="12" cy="8" r="3"/>
    <circle cx="7" cy="16" r="2.5"/>
    <circle cx="17" cy="16" r="2.5"/>
    <line x1="10" y1="10.5" x2="8" y2="13.5" stroke="currentColor" stroke-width="1.8"/>
    <line x1="14" y1="10.5" x2="16" y2="13.5" stroke="currentColor" stroke-width="1.8"/>
    <line x1="9.5" y1="16" x2="14.5" y2="16" stroke="currentColor" stroke-width="1.8"/>
  {:else if k === 'alibaba'}
    <!-- Alibaba/Qwen - cloud -->
    <path d="M6 16C4.3 16 3 14.7 3 13C3 11.5 4 10.3 5.4 10C5.1 9.4 5 8.7 5 8C5 5.8 6.8 4 9 4C10.5 4 11.8 4.8 12.5 6C13.2 4.8 14.5 4 16 4C18.2 4 20 5.8 20 8C20 8.4 19.9 8.7 19.8 9.1C20.5 9.8 21 10.8 21 12C21 14.2 19.2 16 17 16H6Z"/>
  {:else if k === 'fireworks'}
    <!-- Fireworks - starburst -->
    <line x1="12" y1="2" x2="12" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <line x1="12" y1="16" x2="12" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <line x1="2" y1="12" x2="8" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <line x1="16" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <line x1="4.9" y1="4.9" x2="9.2" y2="9.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <line x1="14.8" y1="14.8" x2="19.1" y2="19.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <line x1="4.9" y1="19.1" x2="9.2" y2="14.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <line x1="14.8" y1="9.2" x2="19.1" y2="4.9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <circle cx="12" cy="12" r="3"/>
  {:else if k === 'deepseek'}
    <!-- DeepSeek - magnifying glass with depth -->
    <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/>
    <line x1="16" y1="16" x2="21" y2="21" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="11" cy="11" r="3" opacity="0.4"/>
  {:else if k === 'ollama'}
    <!-- Ollama - llama head silhouette -->
    <path d="M8 4C6.5 4 5 5.5 5 7.5C5 8.5 5.3 9.2 5.8 9.8C4.7 10.8 4 12.3 4 14C4 17 6.5 19.5 9.5 20H14.5C17.5 19.5 20 17 20 14C20 12.3 19.3 10.8 18.2 9.8C18.7 9.2 19 8.5 19 7.5C19 5.5 17.5 4 16 4C15 4 14.2 4.5 13.7 5.3C13.2 5.1 12.6 5 12 5C11.4 5 10.8 5.1 10.3 5.3C9.8 4.5 9 4 8 4Z"/>
    <circle cx="9.5" cy="12" r="1.2" fill="#fffdf7"/>
    <circle cx="14.5" cy="12" r="1.2" fill="#fffdf7"/>
  {:else if k === 'inception'}
    <!-- Inception Labs - diffusion waves / speed lines -->
    <path d="M4 12C8 8 12 6 20 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M4 16C8 12 12 10 20 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
    <path d="M4 20C8 16 12 14 20 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
    <circle cx="20" cy="6" r="2"/>
  {:else if k === 'nvidia'}
    <!-- NVIDIA - GPU chip with circuit lines -->
    <rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/>
    <rect x="7" y="7" width="10" height="10" rx="1"/>
    <line x1="8" y1="2" x2="8" y2="4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="12" y1="2" x2="12" y2="4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="16" y1="2" x2="16" y2="4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="8" y1="20" x2="8" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="12" y1="20" x2="12" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="16" y1="20" x2="16" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="2" y1="8" x2="4" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="2" y1="12" x2="4" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="2" y1="16" x2="4" y2="16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="20" y1="8" x2="22" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="20" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="20" y1="16" x2="22" y2="16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  {:else if k === 'github'}
    <!-- GitHub - Octocat-inspired circle head with tentacle base -->
    <circle cx="12" cy="8" r="5" fill="none" stroke="currentColor" stroke-width="1.8"/>
    <path d="M7 13C5 14 4 16 4 19H20C20 16 19 14 17 13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="9.5" cy="7.5" r="1"/>
    <circle cx="14.5" cy="7.5" r="1"/>
    <path d="M10 10.5C10.5 11.2 13.5 11.2 14 10.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M12 13v3M10 14v2M14 14v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  {:else if k === 'cloudflare'}
    <!-- Cloudflare - shield with hexagon -->
    <path d="M12 2L4 6V13C4 17.4 7.4 21.5 12 22C16.6 21.5 20 17.4 20 13V6L12 2Z" fill="none" stroke="currentColor" stroke-width="1.8"/>
    <path d="M12 7L9 8.7V12L12 13.7L15 12V8.7L12 7Z" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="12" cy="10.5" r="1.2"/>
  {:else if k === 'huggingface'}
    <!-- Hugging Face - simple smiley -->
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.8"/>
    <circle cx="9" cy="10" r="1.5"/>
    <circle cx="15" cy="10" r="1.5"/>
    <path d="M8 15C9 17 15 17 16 15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  {:else}
    <!-- Generic - diamond -->
    <path d="M12 3L21 12L12 21L3 12Z" fill="none" stroke="currentColor" stroke-width="2"/>
    <circle cx="12" cy="12" r="3"/>
  {/if}
</svg>

<style>
  .provider-icon {
    display: inline-block;
    vertical-align: middle;
    flex-shrink: 0;
  }
</style>
