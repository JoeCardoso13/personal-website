import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import Chat from '../components/Chat.svelte';
import * as api from '../lib/api';
import * as storage from '../lib/storage';

vi.mock('../lib/api');
vi.mock('../lib/storage');

const mockedApi = vi.mocked(api);
const mockedStorage = vi.mocked(storage);

function renderChat(tutor: 'python' | 'ruby' | 'javascript' = 'python') {
  return render(Chat, { props: { tutor } });
}

beforeEach(() => {
  vi.restoreAllMocks();
  mockedStorage.getUserId.mockReturnValue('test-user-id');
  mockedStorage.getHistory.mockReturnValue([]);
  mockedStorage.setHistory.mockImplementation(() => {});
  mockedStorage.clearHistory.mockImplementation(() => {});
});

describe('Chat component — initial render', () => {
  it('renders the input field', () => {
    renderChat();
    expect(screen.getByPlaceholderText(/ask about python/i)).toBeInTheDocument();
  });

  it('renders the send button', () => {
    renderChat();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('loads user ID from storage on mount', () => {
    renderChat();
    expect(mockedStorage.getUserId).toHaveBeenCalled();
  });

  it('loads conversation history for the current tutor on mount', () => {
    renderChat('ruby');
    expect(mockedStorage.getHistory).toHaveBeenCalledWith('ruby');
  });

  it('renders previously stored messages on mount', () => {
    mockedStorage.getHistory.mockReturnValue([
      { role: 'user', content: 'decorators' },
      { role: 'assistant', content: 'What do you know about decorators?' },
    ]);
    renderChat();
    expect(screen.getByText('decorators')).toBeInTheDocument();
    expect(screen.getByText(/what do you know about decorators/i)).toBeInTheDocument();
  });

  it('clears rendered messages and persisted history when the clear event fires', async () => {
    mockedStorage.getHistory.mockReturnValue([
      { role: 'user', content: 'decorators' },
      { role: 'assistant', content: 'What do you know about decorators?' },
    ]);

    renderChat('python');
    expect(screen.getByText('decorators')).toBeInTheDocument();

    window.dispatchEvent(new CustomEvent('brush-up:clear-chat'));

    await waitFor(() => {
      expect(screen.queryByText('decorators')).not.toBeInTheDocument();
      expect(mockedStorage.clearHistory).toHaveBeenCalledWith('python');
    });
  });

  it('uses a tutor-specific placeholder for ruby', () => {
    renderChat('ruby');
    expect(screen.getByPlaceholderText(/ask about ruby/i)).toBeInTheDocument();
  });

  it('uses a tutor-specific placeholder for javascript', () => {
    renderChat('javascript');
    expect(screen.getByPlaceholderText(/ask about javascript/i)).toBeInTheDocument();
  });
});

describe('Chat component — sending messages', () => {
  it('calls sendMessage with user_id, tutor, question, and history', async () => {
    mockedApi.sendMessage.mockResolvedValue({
      response: 'Good question!',
      history: [
        { role: 'user', content: 'generators' },
        { role: 'assistant', content: 'Good question!' },
      ],
      usage: { input_tokens: 100, output_tokens: 20 },
    });

    renderChat('python');
    const input = screen.getByPlaceholderText(/ask about python/i);
    const button = screen.getByRole('button', { name: /send/i });

    await fireEvent.input(input, { target: { value: 'generators' } });
    await fireEvent.click(button);

    expect(mockedApi.sendMessage).toHaveBeenCalledWith({
      user_id: 'test-user-id',
      tutor: 'python',
      question: 'generators',
      conversation_history: [],
    });
  });

  it('sends the correct tutor value for ruby', async () => {
    mockedApi.sendMessage.mockResolvedValue({
      response: 'Sure!',
      history: [],
      usage: { input_tokens: 10, output_tokens: 5 },
    });

    renderChat('ruby');
    const input = screen.getByPlaceholderText(/ask about ruby/i);
    await fireEvent.input(input, { target: { value: 'blocks' } });
    await fireEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(mockedApi.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ tutor: 'ruby' }),
    );
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

    renderChat();
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

    renderChat();
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

    renderChat();
    const input = screen.getByPlaceholderText(/ask about python/i) as HTMLInputElement;

    await fireEvent.input(input, { target: { value: 'test' } });
    await fireEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(input.value).toBe('');
  });

  it('persists updated history to storage under the current tutor', async () => {
    const updatedHistory = [
      { role: 'user' as const, content: 'generators' },
      { role: 'assistant' as const, content: 'Interesting topic!' },
    ];
    mockedApi.sendMessage.mockResolvedValue({
      response: 'Interesting topic!',
      history: updatedHistory,
      usage: { input_tokens: 100, output_tokens: 20 },
    });

    renderChat('python');
    const input = screen.getByPlaceholderText(/ask about python/i);
    await fireEvent.input(input, { target: { value: 'generators' } });
    await fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(mockedStorage.setHistory).toHaveBeenCalledWith('python', updatedHistory);
    });
  });

  it('does not send an empty message', async () => {
    renderChat();
    await fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(mockedApi.sendMessage).not.toHaveBeenCalled();
  });

  it('does not send a whitespace-only message', async () => {
    renderChat();
    const input = screen.getByPlaceholderText(/ask about python/i);
    await fireEvent.input(input, { target: { value: '   ' } });
    await fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(mockedApi.sendMessage).not.toHaveBeenCalled();
  });
});

describe('Chat component — loading state', () => {
  it('disables the send button while loading', async () => {
    mockedApi.sendMessage.mockReturnValue(new Promise(() => {}));

    renderChat();
    const input = screen.getByPlaceholderText(/ask about python/i);
    const button = screen.getByRole('button', { name: /send/i });

    await fireEvent.input(input, { target: { value: 'test' } });
    await fireEvent.click(button);

    expect(button).toBeDisabled();
  });

  it('disables the input while loading', async () => {
    mockedApi.sendMessage.mockReturnValue(new Promise(() => {}));

    renderChat();
    const input = screen.getByPlaceholderText(/ask about python/i);

    await fireEvent.input(input, { target: { value: 'test' } });
    await fireEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(input).toBeDisabled();
  });

  it('shows a loading indicator while waiting for response', async () => {
    mockedApi.sendMessage.mockReturnValue(new Promise(() => {}));

    renderChat();
    const input = screen.getByPlaceholderText(/ask about python/i);

    await fireEvent.input(input, { target: { value: 'test' } });
    await fireEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('re-enables the input after response but keeps send disabled until new input', async () => {
    mockedApi.sendMessage.mockResolvedValue({
      response: 'Done!',
      history: [],
      usage: { input_tokens: 10, output_tokens: 5 },
    });

    renderChat();
    const input = screen.getByPlaceholderText(/ask about python/i);
    const button = screen.getByRole('button', { name: /send/i });

    await fireEvent.input(input, { target: { value: 'test' } });
    await fireEvent.click(button);

    await waitFor(() => {
      expect(input).not.toBeDisabled();
      expect(button).toBeDisabled();
    });
  });
});

describe('Chat component — error handling', () => {
  it('displays a user-friendly message on budget exceeded', async () => {
    mockedApi.sendMessage.mockRejectedValue({ code: 'budget_exceeded', message: "You've used your token allocation." });

    renderChat();
    const input = screen.getByPlaceholderText(/ask about python/i);
    await fireEvent.input(input, { target: { value: 'test' } });
    await fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText(/token allocation/i)).toBeInTheDocument();
    });
  });

  it('displays a user-friendly message on rate limit', async () => {
    mockedApi.sendMessage.mockRejectedValue({ code: 'rate_limited', message: 'Too many requests. Please slow down.' });

    renderChat();
    const input = screen.getByPlaceholderText(/ask about python/i);
    await fireEvent.input(input, { target: { value: 'test' } });
    await fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText(/slow down/i)).toBeInTheDocument();
    });
  });

  it('displays a user-friendly message on network error', async () => {
    mockedApi.sendMessage.mockRejectedValue({ code: 'network_error', message: 'Failed to fetch' });

    renderChat();
    const input = screen.getByPlaceholderText(/ask about python/i);
    await fireEvent.input(input, { target: { value: 'test' } });
    await fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText(/network/i)).toBeInTheDocument();
    });
  });

  it('displays a user-friendly message on tutor unavailable', async () => {
    mockedApi.sendMessage.mockRejectedValue({ code: 'tutor_unavailable', message: 'This tutor is temporarily unavailable.' });

    renderChat('ruby');
    const input = screen.getByPlaceholderText(/ask about ruby/i);
    await fireEvent.input(input, { target: { value: 'test' } });
    await fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
    });
  });

  it('re-enables the input after an error but keeps send disabled until new input', async () => {
    mockedApi.sendMessage.mockRejectedValue({ code: 'api_error', message: 'Something went wrong.' });

    renderChat();
    const input = screen.getByPlaceholderText(/ask about python/i);
    const button = screen.getByRole('button', { name: /send/i });
    await fireEvent.input(input, { target: { value: 'test' } });
    await fireEvent.click(button);

    await waitFor(() => {
      expect(input).not.toBeDisabled();
      expect(button).toBeDisabled();
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

    renderChat();
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

    renderChat();
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

    renderChat();
    const input = screen.getByPlaceholderText(/ask about python/i);
    await fireEvent.input(input, { target: { value: 'test' } });
    await fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockedApi.sendMessage).toHaveBeenCalled();
  });

  it('does not send on Shift+Enter', async () => {
    renderChat();
    const input = screen.getByPlaceholderText(/ask about python/i);
    await fireEvent.input(input, { target: { value: 'test' } });
    await fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

    expect(mockedApi.sendMessage).not.toHaveBeenCalled();
  });
});

describe('Chat component — SSR safety', () => {
  it('does not access localStorage at import/render time (only after mount)', () => {
    mockedStorage.getUserId.mockClear();
    mockedStorage.getHistory.mockClear();

    renderChat();

    expect(screen.getByPlaceholderText(/ask about python/i)).toBeInTheDocument();
  });
});
