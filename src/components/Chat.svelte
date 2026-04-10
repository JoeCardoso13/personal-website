<script lang="ts">
  import { onMount } from 'svelte';
  import { marked } from 'marked';
  import { sendMessage } from '../lib/api';
  import type { ApiError, ChatMessage } from '../lib/api';
  import { getHistory, getUserId, setHistory } from '../lib/storage';

  let userId = '';
  let input = '';
  let messages: ChatMessage[] = [];
  let isLoading = false;
  let errorMessage = '';

  onMount(() => {
    userId = getUserId();
    messages = getHistory();
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
  <div class="messages" aria-live="polite">
    {#each messages as message}
      <article class={`message ${message.role}`}>
        {@html renderMarkdown(message.content)}
      </article>
    {/each}

    {#if isLoading}
      <p data-testid="loading-indicator" class="loading">Thinking...</p>
    {/if}
  </div>

  {#if errorMessage}
    <p class="error">{errorMessage}</p>
  {/if}

  <form on:submit|preventDefault={submitMessage}>
    <textarea
      bind:value={input}
      disabled={isLoading}
      on:keydown={handleKeydown}
      placeholder="Ask about Python"
      rows="3"
    ></textarea>
    <button type="submit" disabled={isLoading}>Send</button>
  </form>
</section>

<style>
  .chat {
    display: grid;
    gap: 1rem;
    max-width: 48rem;
    margin: 2rem auto;
    padding: 0 1.5rem;
  }

  .messages {
    display: grid;
    gap: 0.75rem;
  }

  .message,
  .loading,
  .error {
    border-radius: 5px;
    padding: 0.75rem 1rem;
  }

  .user {
    background: #1a1a1a;
  }

  .assistant {
    background: #111;
  }

  .loading {
    color: #a0a0a0;
  }

  .error {
    color: #ff6b6b;
  }

  .message :global(a) {
    color: #00cc7f;
  }

  .message :global(a:hover) {
    text-decoration: none;
  }

  .message :global(code) {
    background: #1a1a1a;
    padding: 0.15rem 0.35rem;
    border-radius: 3px;
    font-size: 0.9em;
  }

  .message :global(pre) {
    background: #1a1a1a;
    border-radius: 5px;
    padding: 1rem;
    overflow-x: auto;
    margin: 0.75rem 0;
  }

  .message :global(pre code) {
    background: none;
    padding: 0;
  }

  form {
    display: grid;
    gap: 0.75rem;
  }

  textarea {
    width: 100%;
    min-height: 5rem;
    resize: vertical;
    border: 1px solid #333;
    border-radius: 5px;
    padding: 0.75rem;
    font: inherit;
    background: #1a1a1a;
    color: #e0e0e0;
  }

  textarea:focus {
    outline: none;
    border-color: #00cc7f;
  }

  textarea::placeholder {
    color: #666;
  }

  button {
    justify-self: start;
    border: 0;
    border-radius: 5px;
    padding: 0.65rem 1.25rem;
    background: #00cc7f;
    color: #0a0a0a;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }

  button:disabled,
  textarea:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }
</style>
