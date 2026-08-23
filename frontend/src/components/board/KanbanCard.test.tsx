import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import KanbanCard from './KanbanCard';
import type { Ticket } from '../../types';

const mockTicket: Ticket = {
  id: 1,
  title: 'Implement login page',
  description: 'Build the login form with email and password fields and integrate with the auth API endpoint',
  priority: 'HIGH',
  status: 'PENDING',
  team_id: 1,
  creator_id: 2,
  assignee_id: 3,
  assignee_name: 'Alice Johnson',
  created_at: '2024-01-15T10:00:00',
  updated_at: '2024-01-15T12:30:00',
};

const unassignedTicket: Ticket = {
  ...mockTicket,
  id: 2,
  assignee_id: null,
  assignee_name: null,
};

describe('KanbanCard', () => {
  it('renders ticket title', () => {
    render(
      <KanbanCard
        ticket={mockTicket}
        columnId="PENDING"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText('Implement login page')).toBeInTheDocument();
  });

  it('renders ticket description', () => {
    render(
      <KanbanCard
        ticket={mockTicket}
        columnId="PENDING"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText(mockTicket.description)).toBeInTheDocument();
  });

  it('renders priority badge with correct text', () => {
    render(
      <KanbanCard
        ticket={mockTicket}
        columnId="PENDING"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('renders medium priority badge', () => {
    const medTicket: Ticket = { ...mockTicket, priority: 'MEDIUM' };
    render(
      <KanbanCard
        ticket={medTicket}
        columnId="INPROGRESS"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('renders low priority badge', () => {
    const lowTicket: Ticket = { ...mockTicket, priority: 'LOW' };
    render(
      <KanbanCard
        ticket={lowTicket}
        columnId="COMPLETED"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('renders assignee name and avatar initials', () => {
    render(
      <KanbanCard
        ticket={mockTicket}
        columnId="PENDING"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('AJ')).toBeInTheDocument();
  });

  it('renders "Unassigned" when no assignee', () => {
    render(
      <KanbanCard
        ticket={unassignedTicket}
        columnId="PENDING"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('calls onEdit with ticket when edit button is clicked', () => {
    const onEdit = vi.fn();
    render(
      <KanbanCard
        ticket={mockTicket}
        columnId="PENDING"
        onEdit={onEdit}
        onDelete={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText(`Edit ticket: ${mockTicket.title}`));
    expect(onEdit).toHaveBeenCalledWith(mockTicket);
  });

  it('calls onDelete with ticket id when delete button is clicked', () => {
    const onDelete = vi.fn();
    render(
      <KanbanCard
        ticket={mockTicket}
        columnId="PENDING"
        onEdit={vi.fn()}
        onDelete={onDelete}
      />
    );
    fireEvent.click(screen.getByLabelText(`Delete ticket: ${mockTicket.title}`));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('sets draggable to true', () => {
    render(
      <KanbanCard
        ticket={mockTicket}
        columnId="PENDING"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    const article = screen.getByLabelText(`Ticket: ${mockTicket.title}`);
    expect(article).toHaveAttribute('draggable', 'true');
  });

  it('applies drag class on dragstart and removes on dragend', () => {
    render(
      <KanbanCard
        ticket={mockTicket}
        columnId="PENDING"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    const article = screen.getByLabelText(`Ticket: ${mockTicket.title}`);

    fireEvent.dragStart(article, {
      dataTransfer: { setData: vi.fn(), effectAllowed: '' },
    });
    expect(article.className).toContain('dragging');

    fireEvent.dragEnd(article);
    expect(article.className).not.toContain('dragging');
  });

  it('sets dataTransfer with ticket id on dragstart', () => {
    render(
      <KanbanCard
        ticket={mockTicket}
        columnId="PENDING"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    const article = screen.getByLabelText(`Ticket: ${mockTicket.title}`);
    const setData = vi.fn();

    fireEvent.dragStart(article, {
      dataTransfer: { setData, effectAllowed: '' },
    });
    expect(setData).toHaveBeenCalledWith('text/plain', '1');
  });

  it('shows "Move to…" button when onMove is provided', () => {
    render(
      <KanbanCard
        ticket={mockTicket}
        columnId="PENDING"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMove={vi.fn()}
      />
    );
    expect(screen.getByText('Move to…')).toBeInTheDocument();
  });

  it('does not show "Move to…" button when onMove is not provided', () => {
    render(
      <KanbanCard
        ticket={mockTicket}
        columnId="PENDING"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.queryByText('Move to…')).not.toBeInTheDocument();
  });

  it('shows move menu with other columns when "Move to…" is clicked', () => {
    render(
      <KanbanCard
        ticket={mockTicket}
        columnId="PENDING"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMove={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Move to…'));
    // Should show In Progress and Done but not To Do (current column)
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'To Do' })).not.toBeInTheDocument();
  });

  it('calls onMove with ticket id and new status when a move menu item is clicked', () => {
    const onMove = vi.fn();
    render(
      <KanbanCard
        ticket={mockTicket}
        columnId="PENDING"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMove={onMove}
      />
    );
    fireEvent.click(screen.getByText('Move to…'));
    fireEvent.click(screen.getByText('In Progress'));
    expect(onMove).toHaveBeenCalledWith(1, 'INPROGRESS');
  });

  it('has accessible aria-label on the card article', () => {
    render(
      <KanbanCard
        ticket={mockTicket}
        columnId="PENDING"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByRole('article', { name: `Ticket: ${mockTicket.title}` })).toBeInTheDocument();
  });
});
