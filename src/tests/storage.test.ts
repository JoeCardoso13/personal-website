import { describe, it, expect, beforeEach } from 'vitest';
import { getUserId, getHistory, setHistory, clearHistory } from '../lib/storage';

beforeEach(() => {
  localStorage.clear();
});

describe('getUserId', () => {
  it('generates a UUID on first call', () => {
    const id = getUserId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('returns the same UUID on subsequent calls', () => {
    const first = getUserId();
    const second = getUserId();
    expect(first).toBe(second);
  });

  it('persists the UUID in localStorage', () => {
    const id = getUserId();
    expect(localStorage.getItem('brush-up-py:user_id')).toBe(id);
  });

  it('returns an existing UUID from localStorage', () => {
    localStorage.setItem('brush-up-py:user_id', 'existing-uuid');
    expect(getUserId()).toBe('existing-uuid');
  });
});

describe('getHistory / setHistory', () => {
  it('returns an empty array when no history exists', () => {
    expect(getHistory()).toEqual([]);
  });

  it('persists and retrieves conversation history', () => {
    const history = [
      { role: 'user' as const, content: 'decorators' },
      { role: 'assistant' as const, content: 'What do you know about decorators?' },
    ];
    setHistory(history);
    expect(getHistory()).toEqual(history);
  });

  it('stores history in localStorage as JSON', () => {
    const history = [{ role: 'user' as const, content: 'hello' }];
    setHistory(history);
    expect(JSON.parse(localStorage.getItem('brush-up-py:history')!)).toEqual(history);
  });

  it('returns an empty array if stored data is corrupted', () => {
    localStorage.setItem('brush-up-py:history', 'not-valid-json');
    expect(getHistory()).toEqual([]);
  });
});

describe('clearHistory', () => {
  it('removes history from localStorage', () => {
    setHistory([{ role: 'user', content: 'hello' }]);
    clearHistory();
    expect(getHistory()).toEqual([]);
    expect(localStorage.getItem('brush-up-py:history')).toBeNull();
  });

  it('does not affect user_id', () => {
    const id = getUserId();
    setHistory([{ role: 'user', content: 'hello' }]);
    clearHistory();
    expect(getUserId()).toBe(id);
  });
});
