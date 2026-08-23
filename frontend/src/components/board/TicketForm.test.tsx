import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import TicketForm from './TicketForm';
import type { Ticket, TeamMemberInfo } from '../../types';

const mockMembers: TeamMemberInfo[] = [
  { id: 1, full_name: 'Alice Johnson', email: 'alice@example.com' },
  { id: 2, full_name: 'Bob Smith', email: 'bob@example.com' },
];

const mockTicket: Ticket = {
  id: 10,
  title: 'Fix navigation bug',
  description: 'The sidebar nav links do not highlight on the active page',
  priority: 'HIGH',
  status: 'INPROGRESS',
  team_id: 1,
  creator_id: 1,
  assignee_id: 2,
  assignee_name: 'Bob Smith',
  created_at: '2024-03-01T10:00:00',
  updated_at: '2024-03-01T14:00:00',
};

describe('TicketForm', () => {
  describe('Create mode (no editingTicket)', () => {
    it('renders the form with "Create Ticket" heading when open', () => {
      render(
        <TicketForm
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          members={mockMembers}
        />
      );
      expect(screen.getByRole('heading', { name: 'Create Ticket' })).toBeInTheDocument();
    });

    it('renders empty title and description fields', () => {
      render(
        <TicketForm
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          members={mockMembers}
        />
      );
      const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
      const descInput = screen.getByLabelText('Description') as HTMLTextAreaElement;
      expect(titleInput.value).toBe('');
      expect(descInput.value).toBe('');
    });

    it('defaults priority to MEDIUM and status to PENDING', () => {
      render(
        <TicketForm
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          members={mockMembers}
        />
      );
      const prioritySelect = screen.getByLabelText('Priority') as HTMLSelectElement;
      const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement;
      expect(prioritySelect.value).toBe('MEDIUM');
      expect(statusSelect.value).toBe('PENDING');
    });

    it('defaults assignee to "Unassigned"', () => {
      render(
        <TicketForm
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          members={mockMembers}
        />
      );
      const assigneeSelect = screen.getByLabelText('Assignee') as HTMLSelectElement;
      expect(assigneeSelect.value).toBe('');
    });

    it('renders team members in the assignee dropdown', () => {
      render(
        <TicketForm
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          members={mockMembers}
        />
      );
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });

    it('shows "Create Ticket" as submit button label', () => {
      render(
        <TicketForm
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          members={mockMembers}
        />
      );
      expect(screen.getByRole('button', { name: 'Create Ticket' })).toBeInTheDocument();
    });

    it('does not render anything when isOpen is false', () => {
      const { container } = render(
        <TicketForm
          isOpen={false}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          members={mockMembers}
        />
      );
      expect(container.innerHTML).toBe('');
    });
  });

  describe('Edit mode (editingTicket provided)', () => {
    it('renders the form with "Edit Ticket" heading', () => {
      render(
        <TicketForm
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          editingTicket={mockTicket}
          members={mockMembers}
        />
      );
      expect(screen.getByText('Edit Ticket')).toBeInTheDocument();
    });

    it('pre-fills title with ticket title', () => {
      render(
        <TicketForm
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          editingTicket={mockTicket}
          members={mockMembers}
        />
      );
      const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
      expect(titleInput.value).toBe('Fix navigation bug');
    });

    it('pre-fills description with ticket description', () => {
      render(
        <TicketForm
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          editingTicket={mockTicket}
          members={mockMembers}
        />
      );
      const descInput = screen.getByLabelText('Description') as HTMLTextAreaElement;
      expect(descInput.value).toBe('The sidebar nav links do not highlight on the active page');
    });

    it('pre-fills priority with ticket priority', () => {
      render(
        <TicketForm
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          editingTicket={mockTicket}
          members={mockMembers}
        />
      );
      const prioritySelect = screen.getByLabelText('Priority') as HTMLSelectElement;
      expect(prioritySelect.value).toBe('HIGH');
    });

    it('pre-fills status with ticket status', () => {
      render(
        <TicketForm
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          editingTicket={mockTicket}
          members={mockMembers}
        />
      );
      const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement;
      expect(statusSelect.value).toBe('INPROGRESS');
    });

    it('pre-fills assignee with ticket assignee_id', () => {
      render(
        <TicketForm
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          editingTicket={mockTicket}
          members={mockMembers}
        />
      );
      const assigneeSelect = screen.getByLabelText('Assignee') as HTMLSelectElement;
      expect(assigneeSelect.value).toBe('2');
    });

    it('shows "Update Ticket" as submit button label', () => {
      render(
        <TicketForm
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          editingTicket={mockTicket}
          members={mockMembers}
        />
      );
      expect(screen.getByRole('button', { name: 'Update Ticket' })).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('shows error when title is empty on submit', async () => {
      const onSubmit = vi.fn();
      render(
        <TicketForm
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={onSubmit}
          members={mockMembers}
        />
      );

      // Type a description so only title fails
      const descInput = screen.getByLabelText('Description');
      fireEvent.change(descInput, { target: { value: 'Some description' } });

      fireEvent.click(screen.getByRole('button', { name: 'Create Ticket' }));

      expect(await screen.findByText('Title is required.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('shows error when description is empty on submit', async () => {
      const onSubmit = vi.fn();
      render(
        <TicketForm
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={onSubmit}
          members={mockMembers}
        />
      );

      // Type a title so only description fails
      const titleInput = screen.getByLabelText('Title');
      fireEvent.change(titleInput, { target: { value: 'Some title' } });

      fireEvent.click(screen.getByRole('button', { name: 'Create Ticket' }));

      expect(await screen.findByText('Description is required.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('shows both errors when both fields are empty', async () => {
      const onSubmit = vi.fn();
      render(
        <TicketForm
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={onSubmit}
          members={mockMembers}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Create Ticket' }));

      expect(await screen.findByText('Title is required.')).toBeInTheDocument();
      expect(screen.getByText('Description is required.')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('clears title error when user starts typing in title field', async () => {
      render(
        <TicketForm
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          members={mockMembers}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Create Ticket' }));
      expect(await screen.findByText('Title is required.')).toBeInTheDocument();

      const titleInput = screen.getByLabelText('Title');
      fireEvent.change(titleInput, { target: { value: 'N' } });

      expect(screen.queryByText('Title is required.')).not.toBeInTheDocument();
    });

    it('clears description error when user starts typing in description field', async () => {
      render(
        <TicketForm
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          members={mockMembers}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Create Ticket' }));
      expect(await screen.findByText('Description is required.')).toBeInTheDocument();

      const descInput = screen.getByLabelText('Description');
      fireEvent.change(descInput, { target: { value: 'D' } });

      expect(screen.queryByText('Description is required.')).not.toBeInTheDocument();
    });
  });

  describe('API error display', () => {
    it('displays API errors passed via errors prop', () => {
      render(
        <TicketForm
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          members={mockMembers}
          errors={{ title: 'Title already exists.', assignee_id: 'Assignee must be a member of the team.' }}
        />
      );
      expect(screen.getByText('Title already exists.')).toBeInTheDocument();
      expect(screen.getByText('Assignee must be a member of the team.')).toBeInTheDocument();
    });

    it('API errors override client errors for the same field', async () => {
      render(
        <TicketForm
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          members={mockMembers}
          errors={{ title: 'Server-side title error.' }}
        />
      );

      // Submit to trigger client validation
      fireEvent.click(screen.getByRole('button', { name: 'Create Ticket' }));

      // The API error should be shown (it takes precedence)
      expect(screen.getByText('Server-side title error.')).toBeInTheDocument();
    });
  });

  describe('Form submission', () => {
    it('calls onSubmit with the correct payload on valid submission', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(
        <TicketForm
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={onSubmit}
          members={mockMembers}
        />
      );

      fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New ticket' } });
      fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'A detailed description' } });
      fireEvent.change(screen.getByLabelText('Priority'), { target: { value: 'HIGH' } });
      fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'INPROGRESS' } });
      fireEvent.change(screen.getByLabelText('Assignee'), { target: { value: '1' } });

      fireEvent.click(screen.getByRole('button', { name: 'Create Ticket' }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          title: 'New ticket',
          description: 'A detailed description',
          priority: 'HIGH',
          status: 'INPROGRESS',
          assignee_id: 1,
        });
      });
    });

    it('sends assignee_id as null when no assignee is selected', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(
        <TicketForm
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={onSubmit}
          members={mockMembers}
        />
      );

      fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'No assignee' } });
      fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Unassigned ticket' } });

      fireEvent.click(screen.getByRole('button', { name: 'Create Ticket' }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ assignee_id: null })
        );
      });
    });

    it('disables submit button while submitting', async () => {
      let resolveSubmit: () => void;
      const onSubmit = vi.fn().mockImplementation(
        () => new Promise<void>((resolve) => { resolveSubmit = resolve; })
      );

      render(
        <TicketForm
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={onSubmit}
          members={mockMembers}
        />
      );

      fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Title' } });
      fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Desc' } });

      fireEvent.click(screen.getByRole('button', { name: 'Create Ticket' }));

      // Button should show "Saving..." and be disabled
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
      });

      // Resolve the promise
      resolveSubmit!();

      // Button re-enables
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Create Ticket' })).not.toBeDisabled();
      });
    });
  });

  describe('Close behavior', () => {
    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(
        <TicketForm
          isOpen={true}
          onClose={onClose}
          onSubmit={vi.fn()}
          members={mockMembers}
        />
      );
      fireEvent.click(screen.getByLabelText('Close form'));
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when overlay is clicked', () => {
      const onClose = vi.fn();
      render(
        <TicketForm
          isOpen={true}
          onClose={onClose}
          onSubmit={vi.fn()}
          members={mockMembers}
        />
      );
      const overlay = screen.getByRole('dialog');
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when Escape key is pressed on overlay', () => {
      const onClose = vi.fn();
      render(
        <TicketForm
          isOpen={true}
          onClose={onClose}
          onSubmit={vi.fn()}
          members={mockMembers}
        />
      );
      const overlay = screen.getByRole('dialog');
      fireEvent.keyDown(overlay, { key: 'Escape' });
      expect(onClose).toHaveBeenCalled();
    });
  });
});
