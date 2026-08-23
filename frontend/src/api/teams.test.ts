import { describe, it, expect, vi, beforeEach } from 'vitest';
import { removeMember } from './teams';
import { NetworkError } from '../types';

const TOKEN = 'mock-token';

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('removeMember', () => {
  it('returns success message on 200 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Member removed successfully.' }),
    }));

    const result = await removeMember(TOKEN, 5);
    expect(result).toEqual({ message: 'Member removed successfully.' });
  });

  it('calls DELETE /teams/members/:userId with correct headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Member removed successfully.' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await removeMember(TOKEN, 42);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/teams/members/42'),
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
      json: async () => ({ error: 'Only the team owner can remove members.' }),
    }));

    await expect(removeMember(TOKEN, 5)).rejects.toMatchObject({
      error: 'Only the team owner can remove members.',
    });
  });

  it('throws NetworkError when fetch throws TypeError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(removeMember(TOKEN, 5)).rejects.toBeInstanceOf(NetworkError);
  });
});
