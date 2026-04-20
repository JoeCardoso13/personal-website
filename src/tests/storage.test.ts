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

  it('persists the UUID under the shared brush-up namespace', () => {
    const id = getUserId();
    expect(localStorage.getItem('brush-up:user_id')).toBe(id);
  });

  it('returns an existing UUID from localStorage', () => {
    localStorage.setItem('brush-up:user_id', 'existing-uuid');
    expect(getUserId()).toBe('existing-uuid');
  });

  it('migrates a legacy brush-up-py:user_id to the new shared key', () => {
    localStorage.setItem('brush-up-py:user_id', 'legacy-uuid');
    expect(getUserId()).toBe('legacy-uuid');
    expect(localStorage.getItem('brush-up:user_id')).toBe('legacy-uuid');
    expect(localStorage.getItem('brush-up-py:user_id')).toBeNull();
  });

  it('prefers the new shared key when both legacy and new exist', () => {
    localStorage.setItem('brush-up-py:user_id', 'legacy-uuid');
    localStorage.setItem('brush-up:user_id', 'new-uuid');
    expect(getUserId()).toBe('new-uuid');
  });
});

describe('getHistory / setHistory', () => {
  it('returns an empty array when no history exists', () => {
    expect(getHistory('python')).toEqual([]);
  });

  it('persists and retrieves conversation history per tutor', () => {
    const history = [
      { role: 'user' as const, content: 'decorators' },
      { role: 'assistant' as const, content: 'What do you know about decorators?' },
    ];
    setHistory('python', history);
    expect(getHistory('python')).toEqual(history);
  });

  it('stores history under a per-tutor key', () => {
    const history = [{ role: 'user' as const, content: 'hello' }];
    setHistory('ruby', history);
    expect(JSON.parse(localStorage.getItem('brush-up:ruby:history')!)).toEqual(history);
  });

  it('keeps histories from different tutors isolated', () => {
    setHistory('python', [{ role: 'user', content: 'python question' }]);
    setHistory('ruby', [{ role: 'user', content: 'ruby question' }]);

    expect(getHistory('python')).toEqual([{ role: 'user', content: 'python question' }]);
    expect(getHistory('ruby')).toEqual([{ role: 'user', content: 'ruby question' }]);
    expect(getHistory('javascript')).toEqual([]);
  });

  it('returns an empty array if stored data is corrupted', () => {
    localStorage.setItem('brush-up:python:history', 'not-valid-json');
    expect(getHistory('python')).toEqual([]);
  });

  it('migrates legacy brush-up-py:history into the python slot', () => {
    const legacy = [
      { role: 'user', content: 'decorators' },
      { role: 'assistant', content: 'What do you know?' },
    ];
    localStorage.setItem('brush-up-py:history', JSON.stringify(legacy));

    expect(getHistory('python')).toEqual(legacy);
    expect(JSON.parse(localStorage.getItem('brush-up:python:history')!)).toEqual(legacy);
    expect(localStorage.getItem('brush-up-py:history')).toBeNull();
  });

  it('does not migrate legacy history into non-python tutors', () => {
    const legacy = [{ role: 'user', content: 'decorators' }];
    localStorage.setItem('brush-up-py:history', JSON.stringify(legacy));

    expect(getHistory('ruby')).toEqual([]);
    expect(localStorage.getItem('brush-up-py:history')).not.toBeNull();
  });
});

describe('clearHistory', () => {
  it('removes history for the given tutor from localStorage', () => {
    setHistory('python', [{ role: 'user', content: 'hello' }]);
    clearHistory('python');
    expect(getHistory('python')).toEqual([]);
    expect(localStorage.getItem('brush-up:python:history')).toBeNull();
  });

  it('does not affect other tutors\' history', () => {
    setHistory('python', [{ role: 'user', content: 'py' }]);
    setHistory('ruby', [{ role: 'user', content: 'rb' }]);
    clearHistory('python');
    expect(getHistory('ruby')).toEqual([{ role: 'user', content: 'rb' }]);
  });

  it('does not affect user_id', () => {
    const id = getUserId();
    setHistory('python', [{ role: 'user', content: 'hello' }]);
    clearHistory('python');
    expect(getUserId()).toBe(id);
  });
});
