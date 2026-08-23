import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cancelInvitation } from './invitations';
import { NetworkError } from '../types';

const TOKEN = 'mock-token';

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('cancelInvitation', () => {
  it('returns id and status on 200 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 7, status: 'cancelled' }),
    }));

    const result = await cancelInvitation(TOKEN, 7);
    expect(result).toEqual({ id: 7, status: 'cancelled' });
  });

  it('calls PUT /invitations/:id/cancel with correct headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 3, status: 'cancelled' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await cancelInvitation(TOKEN, 3);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/invitations/3/cancel'),
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'Authorization': `Bearer ${TOKEN}`,
        }),
      })
    );
  });

  it('throws the error body on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Only pending invitations can be cancelled.' }),
    }));

    await expect(cancelInvitation(TOKEN, 7)).rejects.toMatchObject({
      error: 'Only pending invitations can be cancelled.',
    });
  });

  it('throws NetworkError when fetch throws TypeError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(cancelInvitation(TOKEN, 7)).rejects.toBeInstanceOf(NetworkError);
  });
});
