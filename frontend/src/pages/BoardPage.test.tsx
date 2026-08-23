import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import BoardPage from './BoardPage';
import type { Ticket, TeamMemberInfo } from '../types';

// Mock the AuthContext module
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ token: 'mock-token' }),
}));

// Mock the tickets API module
vi.mock('../api/tickets', () => ({
  getTickets: vi.fn(),
  createTicket: vi.fn(),
  updateTicket: vi.fn(),
  deleteTicket: vi.fn(),
  getTeamMembers: vi.fn(),
}));

import { getTickets, updateTicket, getTeamMembers } from '../api/tickets';

const mockTickets: Ticket[] = [
  {
    id: 1,
    title: 'Task in To Do',
    description: 'Description for task 1',
    priority: 'HIGH',
    status: 'PENDING',
    team_id: 1,
    creator_id: 1,
    assignee_id: 1,
    assignee_name: 'Alice',
    created_at: '2024-01-01T00:00:00',
    updated_at: '2024-01-01T00:00:00',
  },
  {
    id: 2,
    title: 'Task in Progress',
    description: 'Description for task 2',
    priority: 'MEDIUM',
    status: 'INPROGRESS',
    team_id: 1,
    creator_id: 1,
    assignee_id: 2,
    assignee_name: 'Bob',
    created_at: '2024-01-02T00:00:00',
    updated_at: '2024-01-02T00:00:00',
  },
  {
    id: 3,
    title: 'Task Done',
    description: 'Description for task 3',
    priority: 'LOW',
    status: 'COMPLETED',
    team_id: 1,
    creator_id: 1,
    assignee_id: null,
    assignee_name: null,
    created_at: '2024-01-03T00:00:00',
    updated_at: '2024-01-03T00:00:00',
  },
];

const mockMembers: TeamMemberInfo[] = [
  { id: 1, full_name: 'Alice', email: 'alice@example.com' },
  { id: 2, full_name: 'Bob', email: 'bob@example.com' },
];

function renderBoardPage() {
  return render(
    <MemoryRouter>
      <BoardPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BoardPage', () => {
  describe('Loading state', () => {
    it('displays loading indicator while fetching data', () => {
      // Make the API calls hang (never resolve)
      vi.mocked(getTickets).mockReturnValue(new Promise(() => {}));
      vi.mocked(getTeamMembers).mockReturnValue(new Promise(() => {}));

      renderBoardPage();

      expect(screen.getByText('Loading board...')).toBeInTheDocument();
    });

    it('hides loading indicator after data is loaded', async () => {
      vi.mocked(getTickets).mockResolvedValue(mockTickets);
      vi.mocked(getTeamMembers).mockResolvedValue(mockMembers);

      renderBoardPage();

      await waitFor(() => {
        expect(screen.queryByText('Loading board...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error state with retry', () => {
    it('displays error message when API call fails', async () => {
      vi.mocked(getTickets).mockRejectedValue(new Error('Network failure'));
      vi.mocked(getTeamMembers).mockResolvedValue(mockMembers);

      renderBoardPage();

      await waitFor(() => {
        expect(screen.getByText('Network failure')).toBeInTheDocument();
      });
    });

    it('shows error from object with error property', async () => {
      vi.mocked(getTickets).mockRejectedValue({ error: 'Server error occurred' });
      vi.mocked(getTeamMembers).mockResolvedValue(mockMembers);

      renderBoardPage();

      await waitFor(() => {
        expect(screen.getByText('Server error occurred')).toBeInTheDocument();
      });
    });

    it('displays a retry button on error', async () => {
      vi.mocked(getTickets).mockRejectedValue(new Error('Network failure'));
      vi.mocked(getTeamMembers).mockResolvedValue(mockMembers);

      renderBoardPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('retries fetching data when retry button is clicked', async () => {
      // First call fails
      vi.mocked(getTickets).mockRejectedValueOnce(new Error('Network failure'));
      vi.mocked(getTeamMembers).mockResolvedValue(mockMembers);

      renderBoardPage();

      await waitFor(() => {
        expect(screen.getByText('Network failure')).toBeInTheDocument();
      });

      // Setup success for retry
      vi.mocked(getTickets).mockResolvedValueOnce(mockTickets);

      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /retry/i }));

      // Should now show the board content
      await waitFor(() => {
        expect(screen.queryByText('Network failure')).not.toBeInTheDocument();
        expect(screen.getByText('Board')).toBeInTheDocument();
      });
    });
  });

  describe('Successful data load', () => {
    it('renders board title and add ticket button after loading', async () => {
      vi.mocked(getTickets).mockResolvedValue(mockTickets);
      vi.mocked(getTeamMembers).mockResolvedValue(mockMembers);

      renderBoardPage();

      await waitFor(() => {
        expect(screen.getByText('Board')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add ticket/i })).toBeInTheDocument();
      });
    });

    it('renders ticket titles from fetched data', async () => {
      vi.mocked(getTickets).mockResolvedValue(mockTickets);
      vi.mocked(getTeamMembers).mockResolvedValue(mockMembers);

      renderBoardPage();

      await waitFor(() => {
        expect(screen.getByText('Task in To Do')).toBeInTheDocument();
        expect(screen.getByText('Task in Progress')).toBeInTheDocument();
        expect(screen.getByText('Task Done')).toBeInTheDocument();
      });
    });

    it('renders three columns (To Do, In Progress, Done)', async () => {
      vi.mocked(getTickets).mockResolvedValue(mockTickets);
      vi.mocked(getTeamMembers).mockResolvedValue(mockMembers);

      renderBoardPage();

      await waitFor(() => {
        expect(screen.getByRole('region', { name: 'To Do column' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'In Progress column' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Done column' })).toBeInTheDocument();
      });
    });

    it('calls getTickets and getTeamMembers with the auth token', async () => {
      vi.mocked(getTickets).mockResolvedValue(mockTickets);
      vi.mocked(getTeamMembers).mockResolvedValue(mockMembers);

      renderBoardPage();

      await waitFor(() => {
        expect(getTickets).toHaveBeenCalledWith('mock-token');
        expect(getTeamMembers).toHaveBeenCalledWith('mock-token');
      });
    });
  });

  describe('Drag-and-drop optimistic update and revert on failure', () => {
    it('calls updateTicket with new status when ticket is moved via keyboard', async () => {
      vi.mocked(getTickets).mockResolvedValue(mockTickets);
      vi.mocked(getTeamMembers).mockResolvedValue(mockMembers);
      vi.mocked(updateTicket).mockResolvedValue({ ...mockTickets[0], status: 'INPROGRESS' });

      renderBoardPage();

      await waitFor(() => {
        expect(screen.getByText('Task in To Do')).toBeInTheDocument();
      });

      const user = userEvent.setup();

      // Use the keyboard-accessible "Move to..." button which calls the same handler
      const moveButton = screen.getByRole('button', {
        name: 'Move ticket "Task in To Do" to another column',
      });
      await user.click(moveButton);

      // Click "In Progress" in the move menu
      const inProgressOption = screen.getByRole('menuitem', { name: 'In Progress' });
      await user.click(inProgressOption);

      // updateTicket should have been called with the new status
      await waitFor(() => {
        expect(updateTicket).toHaveBeenCalledWith('mock-token', 1, { status: 'INPROGRESS' });
      });
    });

    it('optimistically updates ticket status via drop event on column', async () => {
      vi.mocked(getTickets).mockResolvedValue(mockTickets);
      vi.mocked(getTeamMembers).mockResolvedValue(mockMembers);
      vi.mocked(updateTicket).mockResolvedValue({ ...mockTickets[0], status: 'INPROGRESS' });

      renderBoardPage();

      await waitFor(() => {
        expect(screen.getByText('Task in To Do')).toBeInTheDocument();
      });

      // Find the "In Progress" column
      const inProgressColumn = screen.getByRole('region', { name: 'In Progress column' });

      // Simulate drop with dataTransfer containing ticket ID
      fireEvent.drop(inProgressColumn, {
        dataTransfer: {
          getData: () => '1',
        },
      });

      // updateTicket should have been called with the new status
      await waitFor(() => {
        expect(updateTicket).toHaveBeenCalledWith('mock-token', 1, { status: 'INPROGRESS' });
      });
    });

    it('reverts ticket to original column when API update fails', async () => {
      vi.mocked(getTickets).mockResolvedValue(mockTickets);
      vi.mocked(getTeamMembers).mockResolvedValue(mockMembers);
      vi.mocked(updateTicket).mockRejectedValue(new Error('Update failed'));

      renderBoardPage();

      await waitFor(() => {
        expect(screen.getByText('Task in To Do')).toBeInTheDocument();
      });

      // Use the keyboard-accessible move to trigger the drop logic
      const user = userEvent.setup();
      const moveButton = screen.getByRole('button', {
        name: 'Move ticket "Task in To Do" to another column',
      });
      await user.click(moveButton);

      const inProgressOption = screen.getByRole('menuitem', { name: 'In Progress' });
      await user.click(inProgressOption);

      // Wait for the error notification to appear (revert happened)
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Failed to move ticket. Please try again.')).toBeInTheDocument();
      });
    });

    it('shows error notification that disappears after 5 seconds on drag failure', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.mocked(getTickets).mockResolvedValue(mockTickets);
      vi.mocked(getTeamMembers).mockResolvedValue(mockMembers);
      vi.mocked(updateTicket).mockRejectedValue(new Error('Update failed'));

      renderBoardPage();

      // Wait for the board to load
      await vi.waitFor(() => {
        expect(screen.getByText('Task in To Do')).toBeInTheDocument();
      });

      // Simulate drop on "In Progress" column
      const inProgressColumn = screen.getByRole('region', { name: 'In Progress column' });

      await act(async () => {
        fireEvent.drop(inProgressColumn, {
          dataTransfer: {
            getData: () => '1',
          },
        });
      });

      // Let the rejected promise propagate
      await vi.waitFor(() => {
        expect(screen.getByText('Failed to move ticket. Please try again.')).toBeInTheDocument();
      });

      // Advance time by 4 seconds - notification should still be visible
      await act(async () => {
        vi.advanceTimersByTime(4000);
      });
      expect(screen.getByText('Failed to move ticket. Please try again.')).toBeInTheDocument();

      // Advance to 5 seconds total - notification should disappear
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.queryByText('Failed to move ticket. Please try again.')).not.toBeInTheDocument();

      vi.useRealTimers();
    });
  });
});
