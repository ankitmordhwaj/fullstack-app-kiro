import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import TeamPage from './TeamPage';

// Polyfill HTMLDialogElement methods for jsdom
HTMLDialogElement.prototype.showModal = HTMLDialogElement.prototype.showModal || function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = HTMLDialogElement.prototype.close || function (this: HTMLDialogElement) {
  this.removeAttribute('open');
};

const ownerUser = { id: 1, full_name: 'Alice Owner', email: 'alice@example.com', accent_color: 'royal-blue' as const, created_at: '2024-01-01T00:00:00' };
const memberUser = { id: 2, full_name: 'Bob Member', email: 'bob@example.com', accent_color: 'royal-blue' as const, created_at: '2024-01-01T00:00:00' };

const teamMembersResponse = {
  members: [
    { id: 1, full_name: 'Alice Owner', email: 'alice@example.com', role: 'owner', joined_at: '2024-01-01' },
    { id: 2, full_name: 'Bob Member', email: 'bob@example.com', role: 'member', joined_at: '2024-01-02' },
    { id: 3, full_name: 'Charlie Member', email: 'charlie@example.com', role: 'member', joined_at: '2024-01-03' },
  ],
  pending_invitations: [],
};

const teamMembersWithInvitationsResponse = {
  members: [
    { id: 1, full_name: 'Alice Owner', email: 'alice@example.com', role: 'owner', joined_at: '2024-01-01' },
    { id: 2, full_name: 'Bob Member', email: 'bob@example.com', role: 'member', joined_at: '2024-01-02' },
  ],
  pending_invitations: [
    { id: 10, email: 'invited@example.com', status: 'pending', invited_at: '2024-01-05' },
    { id: 11, email: 'another@example.com', status: 'pending', invited_at: '2024-01-06' },
  ],
};

function mockFetchSuccess(data: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => data,
  });
}

function mockFetchFailure(errorBody: unknown) {
  return vi.fn().mockResolvedValue({
    ok: false,
    json: async () => errorBody,
  });
}

function setupLocalStorageAsUser(user: typeof ownerUser) {
  localStorage.setItem('access_token', 'mock-token');
  localStorage.setItem('user', JSON.stringify(user));
}

function renderTeamPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <TeamPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TeamPage - Remove Member UI', () => {
  describe('Remove button visibility', () => {
    it('renders remove button only for non-owner members when current user is owner', async () => {
      setupLocalStorageAsUser(ownerUser);
      vi.stubGlobal('fetch', mockFetchSuccess(teamMembersResponse));

      renderTeamPage();

      await waitFor(() => {
        expect(screen.getByText('Alice Owner')).toBeInTheDocument();
      });

      // Remove button should appear for member-role users only
      expect(screen.getByRole('button', { name: 'Remove Bob Member' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove Charlie Member' })).toBeInTheDocument();

      // Remove button should NOT appear for the owner row
      expect(screen.queryByRole('button', { name: 'Remove Alice Owner' })).not.toBeInTheDocument();
    });

    it('does NOT render remove buttons for non-owner users', async () => {
      setupLocalStorageAsUser(memberUser);
      vi.stubGlobal('fetch', mockFetchSuccess(teamMembersResponse));

      renderTeamPage();

      await waitFor(() => {
        expect(screen.getByText('Alice Owner')).toBeInTheDocument();
      });

      // No remove buttons at all since current user is not owner
      expect(screen.queryByRole('button', { name: 'Remove Bob Member' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Remove Charlie Member' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Remove Alice Owner' })).not.toBeInTheDocument();
    });
  });

  describe('ConfirmDialog on remove click', () => {
    it('shows confirmation dialog with correct member name when remove is clicked', async () => {
      setupLocalStorageAsUser(ownerUser);
      vi.stubGlobal('fetch', mockFetchSuccess(teamMembersResponse));

      renderTeamPage();

      await waitFor(() => {
        expect(screen.getByText('Bob Member')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: 'Remove Bob Member' }));

      // ConfirmDialog should be visible with the member's name in the message
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByText(/Are you sure you want to remove Bob Member from the team\?/)).toBeInTheDocument();
    });
  });

  describe('Successful member removal', () => {
    it('removes member from displayed list on successful API call', async () => {
      setupLocalStorageAsUser(ownerUser);

      const fetchMock = vi.fn();
      // First call: getTeamMembers
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => teamMembersResponse,
      });
      // Second call: removeMember (DELETE) succeeds
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Member removed successfully.' }),
      });

      vi.stubGlobal('fetch', fetchMock);

      renderTeamPage();

      await waitFor(() => {
        expect(screen.getByText('Bob Member')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: 'Remove Bob Member' }));

      // Click Confirm in dialog
      const dialog = screen.getByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: /confirm/i }));

      // Bob should be removed from the list
      await waitFor(() => {
        expect(screen.queryByText('Bob Member')).not.toBeInTheDocument();
      });

      // Charlie should still be present
      expect(screen.getByText('Charlie Member')).toBeInTheDocument();
    });
  });

  describe('Failed member removal', () => {
    it('shows error banner when removal API call fails', async () => {
      setupLocalStorageAsUser(ownerUser);

      const fetchMock = vi.fn();
      // First call: getTeamMembers
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => teamMembersResponse,
      });
      // Second call: removeMember fails
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Only the team owner can remove members.' }),
      });

      vi.stubGlobal('fetch', fetchMock);

      renderTeamPage();

      await waitFor(() => {
        expect(screen.getByText('Bob Member')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: 'Remove Bob Member' }));

      // Click Confirm in dialog
      const dialog = screen.getByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: /confirm/i }));

      // Error banner should appear
      await waitFor(() => {
        expect(screen.getByText('Only the team owner can remove members.')).toBeInTheDocument();
      });

      // Member should still be in the list
      expect(screen.getByText('Bob Member')).toBeInTheDocument();
    });
  });

  describe('Dismiss dialog', () => {
    it('closes dialog without action when Cancel is clicked', async () => {
      setupLocalStorageAsUser(ownerUser);
      vi.stubGlobal('fetch', mockFetchSuccess(teamMembersResponse));

      renderTeamPage();

      await waitFor(() => {
        expect(screen.getByText('Bob Member')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: 'Remove Bob Member' }));

      // Dialog should appear
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      // Click Cancel in dialog
      await user.click(within(dialog).getByRole('button', { name: /cancel/i }));

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Member should still be in the list
      expect(screen.getByText('Bob Member')).toBeInTheDocument();
    });
  });
});


describe('TeamPage - Cancel Invitation UI', () => {
  describe('Cancel button visibility', () => {
    it('renders cancel button for each pending invitation', async () => {
      setupLocalStorageAsUser(ownerUser);
      vi.stubGlobal('fetch', mockFetchSuccess(teamMembersWithInvitationsResponse));

      renderTeamPage();

      await waitFor(() => {
        expect(screen.getByText('invited@example.com')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: 'Cancel invitation to invited@example.com' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel invitation to another@example.com' })).toBeInTheDocument();
    });
  });

  describe('ConfirmDialog on cancel click', () => {
    it('shows confirmation dialog with correct email when cancel is clicked', async () => {
      setupLocalStorageAsUser(ownerUser);
      vi.stubGlobal('fetch', mockFetchSuccess(teamMembersWithInvitationsResponse));

      renderTeamPage();

      await waitFor(() => {
        expect(screen.getByText('invited@example.com')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: 'Cancel invitation to invited@example.com' }));

      // ConfirmDialog should be visible with the invitee email in the message
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByText(/Are you sure you want to cancel the invitation to invited@example\.com\?/)).toBeInTheDocument();
    });
  });

  describe('Successful invitation cancellation', () => {
    it('removes invitation from displayed list on successful cancel', async () => {
      setupLocalStorageAsUser(ownerUser);

      const fetchMock = vi.fn();
      // First call: getTeamMembers
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => teamMembersWithInvitationsResponse,
      });
      // Second call: cancelInvitation (PUT) succeeds
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 10, status: 'cancelled' }),
      });

      vi.stubGlobal('fetch', fetchMock);

      renderTeamPage();

      await waitFor(() => {
        expect(screen.getByText('invited@example.com')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: 'Cancel invitation to invited@example.com' }));

      // Click Confirm in dialog
      const dialog = screen.getByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: /confirm/i }));

      // invited@example.com should be removed from the list
      await waitFor(() => {
        expect(screen.queryByText('invited@example.com')).not.toBeInTheDocument();
      });

      // another@example.com should still be present
      expect(screen.getByText('another@example.com')).toBeInTheDocument();
    });
  });

  describe('Failed invitation cancellation', () => {
    it('shows error message on failed cancel and re-enables button', async () => {
      setupLocalStorageAsUser(ownerUser);

      const fetchMock = vi.fn();
      // First call: getTeamMembers
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => teamMembersWithInvitationsResponse,
      });
      // Second call: cancelInvitation fails
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Only pending invitations can be cancelled.' }),
      });

      vi.stubGlobal('fetch', fetchMock);

      renderTeamPage();

      await waitFor(() => {
        expect(screen.getByText('invited@example.com')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: 'Cancel invitation to invited@example.com' }));

      // Click Confirm in dialog
      const dialog = screen.getByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: /confirm/i }));

      // Error message should appear
      await waitFor(() => {
        expect(screen.getByText('Only pending invitations can be cancelled.')).toBeInTheDocument();
      });

      // Invitation should still be in the list
      expect(screen.getByText('invited@example.com')).toBeInTheDocument();

      // Cancel button should be re-enabled
      const cancelBtn = screen.getByRole('button', { name: 'Cancel invitation to invited@example.com' });
      expect(cancelBtn).not.toBeDisabled();
    });
  });

  describe('Cancel button disabled while in-flight', () => {
    it('disables cancel button while request is in-flight', async () => {
      setupLocalStorageAsUser(ownerUser);

      let resolveCancelRequest: (value: unknown) => void;
      const cancelPromise = new Promise((resolve) => {
        resolveCancelRequest = resolve;
      });

      const fetchMock = vi.fn();
      // First call: getTeamMembers
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => teamMembersWithInvitationsResponse,
      });
      // Second call: cancelInvitation - hangs until manually resolved
      fetchMock.mockReturnValueOnce(cancelPromise);

      vi.stubGlobal('fetch', fetchMock);

      renderTeamPage();

      await waitFor(() => {
        expect(screen.getByText('invited@example.com')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: 'Cancel invitation to invited@example.com' }));

      // Click Confirm in dialog
      const dialog = screen.getByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: /confirm/i }));

      // Button should be disabled while request is in-flight
      await waitFor(() => {
        const cancelBtn = screen.getByRole('button', { name: 'Cancel invitation to invited@example.com' });
        expect(cancelBtn).toBeDisabled();
      });

      // Resolve the pending request
      resolveCancelRequest!({
        ok: true,
        json: async () => ({ id: 10, status: 'cancelled' }),
      });

      // After resolution, the invitation should be removed
      await waitFor(() => {
        expect(screen.queryByText('invited@example.com')).not.toBeInTheDocument();
      });
    });
  });

  describe('Dismiss dialog', () => {
    it('closes dialog without action when Cancel is clicked in dialog', async () => {
      setupLocalStorageAsUser(ownerUser);
      vi.stubGlobal('fetch', mockFetchSuccess(teamMembersWithInvitationsResponse));

      renderTeamPage();

      await waitFor(() => {
        expect(screen.getByText('invited@example.com')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: 'Cancel invitation to invited@example.com' }));

      // Dialog should appear
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      // Click Cancel in dialog (dismiss)
      await user.click(within(dialog).getByRole('button', { name: /cancel/i }));

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Invitation should still be in the list
      expect(screen.getByText('invited@example.com')).toBeInTheDocument();
    });
  });
});
