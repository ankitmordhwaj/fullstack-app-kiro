import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTasks, createTask, updateTask, deleteTask } from './tasks';
import { NetworkError } from '../types';
import type { Task, TaskPayload } from '../types';

const TOKEN = 'mock-token';

const mockTask: Task = {
  id: 1,
  title: 'Test task',
  description: 'A description',
  priority: 'HIGH',
  status: 'PENDING',
  created_at: '2024-01-01T00:00:00',
  updated_at: '2024-01-01T00:00:00',
  user_id: 1,
};

const mockPayload: TaskPayload = {
  title: 'Test task',
  description: 'A description',
  priority: 'HIGH',
  status: 'PENDING',
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

// ── getTasks ──────────────────────────────────────────────────────────────────

describe('getTasks', () => {
  it('returns tasks array on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [mockTask],
    }));

    const result = await getTasks(TOKEN);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(mockTask);
  });

  it('sends Authorization Bearer header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal('fetch', fetchMock);

    await getTasks(TOKEN);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/tasks'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Authorization': `Bearer ${TOKEN}` }),
      })
    );
  });

  it('throws the error body on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Unauthorized' }),
    }));

    await expect(getTasks('bad-token')).rejects.toMatchObject({ error: 'Unauthorized' });
  });

  it('throws NetworkError when fetch throws TypeError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(getTasks(TOKEN)).rejects.toBeInstanceOf(NetworkError);
  });
});

// ── createTask ────────────────────────────────────────────────────────────────

describe('createTask', () => {
  it('returns the created task on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTask,
    }));

    const result = await createTask(TOKEN, mockPayload);
    expect(result).toEqual(mockTask);
  });

  it('calls POST /tasks with correct body and headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTask,
    });
    vi.stubGlobal('fetch', fetchMock);

    await createTask(TOKEN, mockPayload);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/tasks'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(mockPayload),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TOKEN}`,
        }),
      })
    );
  });

  it('throws the error body on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Validation failed' }),
    }));

    await expect(createTask(TOKEN, mockPayload)).rejects.toMatchObject({ error: 'Validation failed' });
  });

  it('throws NetworkError when fetch throws TypeError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(createTask(TOKEN, mockPayload)).rejects.toBeInstanceOf(NetworkError);
  });
});

// ── updateTask ────────────────────────────────────────────────────────────────

describe('updateTask', () => {
  it('returns the updated task on success', async () => {
    const updated = { ...mockTask, title: 'Updated' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => updated,
    }));

    const result = await updateTask(TOKEN, 1, { ...mockPayload, title: 'Updated' });
    expect(result.title).toBe('Updated');
  });

  it('calls PUT /tasks/:id with correct body and headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTask,
    });
    vi.stubGlobal('fetch', fetchMock);

    await updateTask(TOKEN, 42, mockPayload);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/tasks/42'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(mockPayload),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TOKEN}`,
        }),
      })
    );
  });

  it('throws the error body on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Not found' }),
    }));

    await expect(updateTask(TOKEN, 99, mockPayload)).rejects.toMatchObject({ error: 'Not found' });
  });

  it('throws NetworkError when fetch throws TypeError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(updateTask(TOKEN, 1, mockPayload)).rejects.toBeInstanceOf(NetworkError);
  });
});

// ── deleteTask ────────────────────────────────────────────────────────────────

describe('deleteTask', () => {
  it('resolves void on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'deleted' }),
    }));

    await expect(deleteTask(TOKEN, 1)).resolves.toBeUndefined();
  });

  it('calls DELETE /tasks/:id with correct headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    await deleteTask(TOKEN, 7);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/tasks/7'),
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          'Authorization': `Bearer ${TOKEN}`,
        }),
      })
    );
  });

  it('throws the error body on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Forbidden' }),
    }));

    await expect(deleteTask(TOKEN, 1)).rejects.toMatchObject({ error: 'Forbidden' });
  });

  it('throws NetworkError when fetch throws TypeError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(deleteTask(TOKEN, 1)).rejects.toBeInstanceOf(NetworkError);
  });
});
