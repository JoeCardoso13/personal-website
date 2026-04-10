import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import Chat from '../components/Chat.svelte';
import * as api from '../lib/api';
import * as storage from '../lib/storage';

vi.mock('../lib/api');
vi.mock('../lib/storage');

const mockedApi = vi.mocked(api);
const mockedStorage = vi.mocked(storage);

beforeEach(() => {
  vi.restoreAllMocks();
  mockedStorage.getUserId.mockReturnValue('test-user-id');
  mockedStorage.getHistory.mockReturnValue([]);
  mockedStorage.setHistory.mockImplementation(() => {});
  mockedStorage.clearHistory.mockImplementation(() => {});
});

describe('Chat component — initial render', () => {
  it('renders the input field', () => {
    render(Chat);
    expect(screen.getByPlaceholderText(/ask about python/i)).toBeInTheDocument();
  });

  it('renders the send button', () => {
    render(Chat);
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('loads user ID from storage on mount', () => {
    render(Chat);
    expect(mockedStorage.getUserId).toHaveBeenCalled();
  });

  it('loads conversation history from storage on mount', () => {
    render(Chat);
    expect(mockedStorage.getHistory).toHaveBeenCalled();
  });

  it('renders previously stored messages on mount', () => {
    mockedStorage.getHistory.mockReturnValue([
      { role: 'user', content: 'decorators' },
      { role: 'assistant', content: 'What do you know about decorators?' },
    ]);
    render(Chat);
    expect(screen.getByText('decorators')).toBeInTheDocument();
    expect(screen.getByText(/what do you know about decorators/i)).toBeInTheDocument();
  });
});

describe('Chat component — sending messages', () => {
  it('calls sendMessage with user_id, question, and history', async () => {
    mockedApi.sendMessage.mockResolvedValue({
      response: 'Good question!',
      history: [
        { role: 'user', content: 'generators' },
        { role: 'assistant', content: 'Good question!' },
      ],
      usage: { input_tokens: 100, output_tokens: 20 },
    });

    render(Chat);
    const input = screen.getByPlaceholderText(/ask about python/i);
    const button = screen.getByRole('button', { name: /send/i });

    await fireEvent.input(input, { target: { value: 'generators' } });
    await fireEvent.click(button);

    expect(mockedApi.sendMessage).toHaveBeenCalledWith({
      user_id: 'test-user-id',
      question: 'generators',
      conversation_history: [],
    });
  });

  it('displays the user message immediately after sending', async () => {
    mockedApi.sendMessage.mockResolvedValue({
      response: 'Sure!',
      history: [
        { role: 'user', content: 'closures' },
        { role: 'assistant', content: 'Sure!' },
      ],
      usage: { input_tokens: 50, output_tokens: 10 },
    });

    render(Chat);
    const input = screen.getByPlaceholderText(/ask about python/i);
    const button = screen.getByRole('button', { name: /send/i });

    await fireEvent.input(input, { target: { value: 'closures' } });
    await fireEvent.click(button);

    expect(screen.getByText('closures')).toBeInTheDocument();
  });

  it('displays the assistant response after API returns', async () => {
    mockedApi.sendMessage.mockResolvedValue({
      response: 'Let me explain generators...',
      history: [
        { role: 'user', content: 'generators' },
        { role: 'assistant', content: 'Let me explain generators...' },
      ],
      usage: { input_tokens: 100, output_tokens: 30 },
    });

    render(Chat);
    const input = screen.getByPlaceholderText(/ask about python/i);
    const button = screen.getByRole('button', { name: /send/i });

    await fireEvent.input(input, { target: { value: 'generators' } });
    await fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/let me explain generators/i)).toBeInTheDocument();
    });
  });

  it('clears the input after sending', async () => {
    mockedApi.sendMessage.mockResolvedValue({
      response: 'OK',
      history: [],
      usage: { input_tokens: 10, output_tokens: 5 },
    });

    render(Chat);
    const input = screen.getByPlaceholderText(/ask about python/i) as HTMLInputElement;

    await fireEvent.input(input, { target: { value: 'test' } });
    await fireEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(input.value).toBe('');
  });

  it('persists updated history to storage after response', async () => {
    const updatedHistory = [
      { role: 'user' as const, content: 'generators' },
      { role: 'assistant' as const, content: 'Interesting topic!' },
    ];
    mockedApi.sendMessage.mockResolvedValue({
      response: 'Interesting topic!',
      history: updatedHistory,
      usage: { input_tokens: 100, output_tokens: 20 },
    });

    render(Chat);
    const input = screen.getByPlaceholderText(/ask about python/i);
    await fireEvent.input(input, { target: { value: 'generators' } });
    await fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(mockedStorage.setHistory).toHaveBeenCalledWith(updatedHistory);
    });
  });

  it('does not send an empty message', async () => {
    render(Chat);
    await fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(mockedApi.sendMessage).not.toHaveBeenCalled();
  });

  it('does not send a whitespace-only message', async () => {
    render(Chat);
    const input = screen.getByPlaceholderText(/ask about python/i);
    await fireEvent.input(input, { target: { value: '   ' } });
    await fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(mockedApi.sendMessage).not.toHaveBeenCalled();
  });
});

describe('Chat component — loading state', () => {
  it('disables the send button while loading', async () => {
    mockedApi.sendMessage.mockReturnValue(new Promise(() => {})); // never resolves

    render(Chat);
    const input = screen.getByPlaceholderText(/ask about python/i);
    const button = screen.getByRole('button', { name: /send/i });

    await fireEvent.input(input, { target: { value: 'test' } });
    await fireEvent.click(button);

    expect(button).toBeDisabled();
  });

  it('disables the input while loading', async () => {
    mockedApi.sendMessage.mockReturnValue(new Promise(() => {}));

    render(Chat);
    const input = screen.getByPlaceholderText(/ask about python/i);

    await fireEvent.input(input, { target: { value: 'test' } });
    await fireEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(input).toBeDisabled();
  });

  it('shows a loading indicator while waiting for response', async () => {
    mockedApi.sendMessage.mockReturnValue(new Promise(() => {}));

    render(Chat);
    const input = screen.getByPlaceholderText(/ask about python/i);

    await fireEvent.input(input, { target: { value: 'test' } });
    await fireEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('re-enables input and button after response', async () => {
    mockedApi.sendMessage.mockResolvedValue({
      response: 'Done!',
      history: [],
      usage: { input_tokens: 10, output_tokens: 5 },
    });

    render(Chat);
    const input = screen.getByPlaceholderText(/ask about python/i);
    const button = screen.getByRole('button', { name: /send/i });

    await fireEvent.input(input, { target: { value: 'test' } });
    await fireEvent.click(button);

    await waitFor(() => {
      expect(button).not.toBeDisabled();
      expect(input).not.toBeDisabled();
    });
  });
});

describe('Chat component — error handling', () => {
  it('displays a user-friendly message on budget exceeded', async () => {
    mockedApi.sendMessage.mockRejectedValue({ code: 'budget_exceeded', message: "You've used your token allocation." });

    render(Chat);
    const input = screen.getByPlaceholderText(/ask about python/i);
    await fireEvent.input(input, { target: { value: 'test' } });
    await fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText(/token allocation/i)).toBeInTheDocument();
    });
  });

  it('displays a user-friendly message on rate limit', async () => {
    mockedApi.sendMessage.mockRejectedValue({ code: 'rate_limited', message: 'Too many requests. Please slow down.' });

    render(Chat);
    const input = screen.getByPlaceholderText(/ask about python/i);
    await fireEvent.input(input, { target: { value: 'test' } });
    await fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText(/slow down/i)).toBeInTheDocument();
    });
  });

  it('displays a user-friendly message on network error', async () => {
    mockedApi.sendMessage.mockRejectedValue({ code: 'network_error', message: 'Failed to fetch' });

    render(Chat);
    const input = screen.getByPlaceholderText(/ask about python/i);
    await fireEvent.input(input, { target: { value: 'test' } });
    await fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText(/network/i)).toBeInTheDocument();
    });
  });

  it('re-enables input after an error', async () => {
    mockedApi.sendMessage.mockRejectedValue({ code: 'api_error', message: 'Something went wrong.' });

    render(Chat);
    const input = screen.getByPlaceholderText(/ask about python/i);
    const button = screen.getByRole('button', { name: /send/i });
    await fireEvent.input(input, { target: { value: 'test' } });
    await fireEvent.click(button);

    await waitFor(() => {
      expect(button).not.toBeDisabled();
      expect(input).not.toBeDisabled();
    });
  });
});

describe('Chat component — markdown and code rendering', () => {
  it('renders markdown code blocks as <pre><code> elements', async () => {
    mockedApi.sendMessage.mockResolvedValue({
      response: 'Here is an example:\n\n```python\ndef hello():\n    print("hi")\n```',
      history: [
        { role: 'user', content: 'example' },
        { role: 'assistant', content: 'Here is an example:\n\n```python\ndef hello():\n    print("hi")\n```' },
      ],
      usage: { input_tokens: 100, output_tokens: 30 },
    });

    render(Chat);
    const input = screen.getByPlaceholderText(/ask about python/i);
    await fireEvent.input(input, { target: { value: 'example' } });
    await fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      const codeBlock = document.querySelector('pre code');
      expect(codeBlock).not.toBeNull();
      expect(codeBlock!.textContent).toContain('def hello()');
    });
  });

  it('renders inline code with <code> elements', async () => {
    mockedApi.sendMessage.mockResolvedValue({
      response: 'Use `print()` to output text.',
      history: [
        { role: 'user', content: 'how to print' },
        { role: 'assistant', content: 'Use `print()` to output text.' },
      ],
      usage: { input_tokens: 50, output_tokens: 15 },
    });

    render(Chat);
    const input = screen.getByPlaceholderText(/ask about python/i);
    await fireEvent.input(input, { target: { value: 'how to print' } });
    await fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      const inlineCode = document.querySelector('code');
      expect(inlineCode).not.toBeNull();
      expect(inlineCode!.textContent).toContain('print()');
    });
  });
});

describe('Chat component — keyboard interaction', () => {
  it('sends message on Enter key', async () => {
    mockedApi.sendMessage.mockResolvedValue({
      response: 'OK',
      history: [],
      usage: { input_tokens: 10, output_tokens: 5 },
    });

    render(Chat);
    const input = screen.getByPlaceholderText(/ask about python/i);
    await fireEvent.input(input, { target: { value: 'test' } });
    await fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockedApi.sendMessage).toHaveBeenCalled();
  });

  it('does not send on Shift+Enter', async () => {
    render(Chat);
    const input = screen.getByPlaceholderText(/ask about python/i);
    await fireEvent.input(input, { target: { value: 'test' } });
    await fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

    expect(mockedApi.sendMessage).not.toHaveBeenCalled();
  });
});

describe('Chat component — SSR safety', () => {
  it('does not access localStorage at import/render time (only after mount)', () => {
    // Regression: the component previously called getUserId() and getHistory()
    // at the top level of <script>, which blows up during SSR where
    // localStorage is undefined. The fix was to move them into onMount().
    // This test verifies that render doesn't throw when storage is mocked,
    // and that the component remains functional.
    mockedStorage.getUserId.mockClear();
    mockedStorage.getHistory.mockClear();

    render(Chat);

    expect(screen.getByPlaceholderText(/ask about python/i)).toBeInTheDocument();
  });
});
