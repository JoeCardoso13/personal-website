<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { marked } from 'marked';
  import { sendMessage } from '../lib/api';
  import type { ApiError, ChatMessage } from '../lib/api';
  import { getHistory, getUserId, setHistory } from '../lib/storage';

  let userId = '';
  let input = '';
  let messages: ChatMessage[] = [];
  let isLoading = false;
  let errorMessage = '';
  let messagesEl: HTMLDivElement;

  async function scrollToBottom(): Promise<void> {
    await tick();
    if (messagesEl) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  onMount(() => {
    userId = getUserId();
    messages = getHistory();
    void scrollToBottom();
  });

  function renderMarkdown(content: string): string {
    return marked.parse(content, { async: false }) as string;
  }

  function getErrorMessage(error: unknown): string {
    const apiError = error as Partial<ApiError>;

    if (apiError.code === 'network_error') {
      return `Network error: ${apiError.message ?? 'Please check your connection and try again.'}`;
    }

    if (typeof apiError.message === 'string') {
      return apiError.message;
    }

    return 'Something went wrong. Please try again.';
  }

  async function submitMessage(): Promise<void> {
    const question = input.trim();

    if (!question || isLoading) {
      return;
    }

    const history = messages;
    messages = [...messages, { role: 'user', content: question }];
    void scrollToBottom();
    input = '';
    errorMessage = '';
    isLoading = true;

    try {
      const response = await sendMessage({
        user_id: userId,
        question,
        conversation_history: history,
      });
      messages = response.history;
      void scrollToBottom();
      setHistory(response.history);
    } catch (error) {
      errorMessage = getErrorMessage(error);
    } finally {
      isLoading = false;
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submitMessage();
    }
  }
</script>

<section class="chat" aria-label="Python study chat">
  <div bind:this={messagesEl} class="messages" aria-live="polite">
    {#each messages as message}
      <article class={`message ${message.role}`}>
        {#if message.role === 'user'}
          <span class="role-tag">you</span>
        {/if}
        {@html renderMarkdown(message.content)}
      </article>
    {/each}

    {#if isLoading}
      <p data-testid="loading-indicator" class="loading">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </p>
    {/if}
  </div>

  {#if errorMessage}
    <p class="error">{errorMessage}</p>
  {/if}

  <form on:submit|preventDefault={submitMessage}>
    <div class="input-row">
      <textarea
        bind:value={input}
        disabled={isLoading}
        on:keydown={handleKeydown}
        placeholder="Ask about Python..."
        rows="1"
      ></textarea>
      <button type="submit" disabled={isLoading || !input.trim()} aria-label="Send">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="19" x2="12" y2="5"></line>
          <polyline points="5 12 12 5 19 12"></polyline>
        </svg>
      </button>
    </div>
  </form>
</section>

<style>
  /* ---- Layout: flex column fills parent, messages grow, form pins bottom ---- */
  .chat {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    gap: 0.75rem;
  }

  .messages {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-right: 0.25rem;
    scroll-behavior: smooth;
  }

  /* Thin scrollbar */
  .messages::-webkit-scrollbar {
    width: 4px;
  }
  .messages::-webkit-scrollbar-track {
    background: transparent;
  }
  .messages::-webkit-scrollbar-thumb {
    background: #333;
    border-radius: 2px;
  }
  .messages {
    scrollbar-width: thin;
    scrollbar-color: #333 transparent;
  }

  /* ---- Messages ---- */
  .message {
    padding: 0.6rem 0.85rem;
    border-radius: 6px;
    line-height: 1.6;
  }

  .message :global(p:last-child) {
    margin-bottom: 0;
  }

  .user {
    background: #1a1a2a;
    border-left: 2px solid var(--accent, #00ff9f);
  }

  .role-tag {
    display: block;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--accent, #00ff9f);
    margin-bottom: 0.2rem;
    opacity: 0.7;
  }

  .assistant {
    background: transparent;
    padding-left: 0.85rem;
  }

  /* ---- Loading dots ---- */
  .loading {
    padding: 0.6rem 0.85rem;
    display: flex;
    gap: 0.3rem;
    align-items: center;
  }

  .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--text-dim, #a0a0a0);
    animation: blink 1.4s infinite both;
  }
  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }

  @keyframes blink {
    0%, 80%, 100% { opacity: 0.2; }
    40% { opacity: 1; }
  }

  .error {
    padding: 0.5rem 0.85rem;
    color: #ff6b6b;
    font-size: 0.85rem;
  }

  /* ---- Markdown inside messages ---- */
  .message :global(a) {
    color: #00cc7f;
  }

  .message :global(a:hover) {
    text-decoration: none;
  }

  .message :global(code) {
    background: #1a1a1a;
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    font-size: 0.88em;
  }

  .message :global(pre) {
    background: #111;
    border: 1px solid #222;
    border-radius: 5px;
    padding: 0.85rem;
    overflow-x: auto;
    margin: 0.5rem 0;
  }

  .message :global(pre code) {
    background: none;
    padding: 0;
  }

  /* ---- Input area ---- */
  form {
    flex-shrink: 0;
    padding-top: 0.5rem;
    border-top: 1px solid #1a1a1a;
  }

  .input-row {
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
    background: #111;
    border: 1px solid #2a2a2a;
    border-radius: 10px;
    padding: 0.5rem 0.5rem 0.5rem 0.85rem;
    transition: border-color 0.15s;
  }

  .input-row:focus-within {
    border-color: #00cc7f;
  }

  textarea {
    flex: 1;
    border: none;
    background: transparent;
    color: #e0e0e0;
    font: inherit;
    font-size: 0.92rem;
    line-height: 1.5;
    resize: none;
    padding: 0.25rem 0;
    min-height: 1.5em;
    max-height: 8rem;
    overflow-y: auto;
  }

  textarea:focus {
    outline: none;
  }

  textarea::placeholder {
    color: #555;
  }

  button {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: 0;
    border-radius: 6px;
    background: var(--accent, #00ff9f);
    color: #0a0a0a;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  button:hover:not(:disabled) {
    opacity: 0.85;
  }

  button:disabled {
    opacity: 0.2;
    cursor: default;
  }

  textarea:disabled {
    opacity: 0.5;
  }

  /* ---- Mobile ---- */
  @media (max-width: 640px) {
    .message {
      padding: 0.4rem 0.6rem;
      font-size: 0.88rem;
    }

    .user {
      border-left-width: 2px;
    }

    .role-tag {
      font-size: 0.62rem;
    }

    /* Keep code blocks from blowing out the layout */
    .message :global(pre) {
      padding: 0.6rem;
      font-size: 0.8rem;
      max-width: calc(100vw - 3rem);
    }

    .message :global(code) {
      font-size: 0.82em;
      word-break: break-word;
    }

    .input-row {
      padding: 0.4rem 0.4rem 0.4rem 0.7rem;
      border-radius: 8px;
    }

    textarea {
      font-size: 0.88rem;
    }

    button {
      width: 1.75rem;
      height: 1.75rem;
    }

    button svg {
      width: 15px;
      height: 15px;
    }
  }
</style>
