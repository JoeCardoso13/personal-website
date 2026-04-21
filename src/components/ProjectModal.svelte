<script lang="ts">
  import { onMount } from 'svelte';
  import type { Tutor } from '../lib/api';
  import { getHistory } from '../lib/storage';

  export let tutor: Tutor;
  export let videoSrc: string;
  export let videoLabel = '';
  export let title = '$ cat about.md';
  export let ctaLabel = 'try now →';

  let open = false;
  let showVideo = true;
  const compactModalQuery = '(max-width: 640px), (max-width: 900px) and (max-height: 520px)';

  function close(): void {
    open = false;
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && open) {
      close();
    }
  }

  function handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      close();
    }
  }

  function syncVideoVisibility(query: MediaQueryList | MediaQueryListEvent): void {
    showVideo = !query.matches;
  }

  onMount(() => {
    const mediaQuery = window.matchMedia(compactModalQuery);
    syncVideoVisibility(mediaQuery);

    try {
      if (getHistory(tutor).length === 0) {
        open = true;
      }
    } catch {
      open = true;
    }

    window.addEventListener('keydown', handleKeydown);
    mediaQuery.addEventListener('change', syncVideoVisibility);

    return () => {
      window.removeEventListener('keydown', handleKeydown);
      mediaQuery.removeEventListener('change', syncVideoVisibility);
    };
  });
</script>

{#if open}
  <div
    class="backdrop"
    on:click={handleBackdropClick}
    on:keydown={handleKeydown}
    role="presentation"
  >
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="project-modal-title">
      <header class="modal-header">
        <h2 id="project-modal-title">{title}</h2>
        <button type="button" class="close" on:click={close} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="5" x2="19" y2="19"></line>
            <line x1="19" y1="5" x2="5" y2="19"></line>
          </svg>
        </button>
      </header>

      <div class="modal-body">
        {#if showVideo}
          <figure class="media-wrap">
            <video
              class="media"
              src={videoSrc}
              autoplay
              loop
              muted
              playsinline
              preload="auto"
              aria-label={videoLabel}
            ></video>
          </figure>
        {/if}

        <div class="description">
          <slot>
            <p>Placeholder — description coming soon.</p>
          </slot>
        </div>

        <div class="cta-row">
          <button type="button" class="cta" on:click={close}>{ctaLabel}</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.82);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    z-index: 100;
    animation: fade-in 0.18s ease-out;
    backdrop-filter: blur(2px);
  }

  .modal {
    background: #0a0a0a;
    border: 1px solid var(--accent, #00ff9f);
    border-radius: 6px;
    max-width: 880px;
    width: 100%;
    max-height: calc(100dvh - 3rem);
    display: flex;
    flex-direction: column;
    box-shadow: 0 0 40px rgba(0, 255, 159, 0.12);
    overflow: hidden;
    animation: lift-in 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.7rem 1rem;
    border-bottom: 1px solid var(--border, #333);
    flex-shrink: 0;
    background: #0d0d0d;
  }

  .modal-header h2 {
    color: var(--accent, #00ff9f);
    font-size: 0.95rem;
    margin: 0;
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  .close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: var(--text-dim, #a0a0a0);
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.15s, color 0.15s;
  }

  .close:hover {
    opacity: 1;
    color: var(--accent, #00ff9f);
  }

  .modal-body {
    overflow-y: auto;
    padding: 1.1rem 1.1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    scrollbar-width: thin;
    scrollbar-color: #333 transparent;
  }

  .modal-body::-webkit-scrollbar {
    width: 4px;
  }
  .modal-body::-webkit-scrollbar-track {
    background: transparent;
  }
  .modal-body::-webkit-scrollbar-thumb {
    background: #333;
    border-radius: 2px;
  }

  .media-wrap {
    margin: 0;
    border: 1px solid var(--border, #333);
    border-radius: 4px;
    overflow: hidden;
    background: #050505;
    display: flex;
    justify-content: center;
  }

  .media {
    display: block;
    width: 100%;
    max-height: 62dvh;
    object-fit: contain;
  }

  .description {
    color: var(--text, #e0e0e0);
    line-height: 1.65;
    font-size: 0.92rem;
  }

  .description :global(p) {
    margin: 0 0 0.75rem;
  }

  .description :global(p:last-child) {
    margin-bottom: 0;
  }

  .description :global(.modal-mobile-only) {
    display: none;
  }

  .description :global(code) {
    background: #1a1a1a;
    color: var(--accent, #00ff9f);
    padding: 0.1rem 0.35rem;
    border-radius: 3px;
    font-size: 0.88em;
  }

  .description :global(a) {
    color: var(--accent-dim, #00cc7f);
  }

  .description :global(a:hover) {
    color: var(--accent, #00ff9f);
  }

  .cta-row {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.25rem;
  }

  .cta {
    background: var(--accent, #00ff9f);
    color: #0a0a0a;
    border: none;
    border-radius: 5px;
    padding: 0.6rem 1.2rem;
    font: inherit;
    font-size: 0.9rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.15s;
  }

  .cta:hover {
    opacity: 0.88;
    transform: translateY(-1px);
  }

  .cta:active {
    transform: translateY(0);
  }

  .cta:focus-visible {
    outline: 2px solid var(--accent, #00ff9f);
    outline-offset: 2px;
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes lift-in {
    from { opacity: 0; transform: translateY(8px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @media (max-width: 640px) {
    .backdrop {
      padding: 0.75rem;
    }
    .modal {
      max-height: calc(100dvh - 1.5rem);
    }
    .modal-header {
      padding: 0.55rem 0.8rem;
    }
    .modal-header h2 {
      font-size: 0.88rem;
    }
    .modal-body {
      padding: 0.9rem 0.9rem 1rem;
      gap: 0.85rem;
    }
    .description {
      font-size: 0.88rem;
      line-height: 1.55;
    }
    .media {
      max-height: 50dvh;
    }
    .cta-row {
      justify-content: stretch;
    }
    .cta {
      width: 100%;
      padding: 0.7rem 1rem;
    }
  }

  @media (max-width: 640px), (max-width: 900px) and (max-height: 520px) {
    .backdrop {
      align-items: center;
      padding: 0.65rem;
    }
    .modal {
      max-width: 26rem;
      max-height: calc(100dvh - 1.3rem);
    }
    .modal-body {
      gap: 0.75rem;
    }
    .description :global(.modal-desktop-only) {
      display: none;
    }
    .description :global(.modal-mobile-only) {
      display: block;
    }
  }
</style>
