import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import KanbanColumn from './KanbanColumn';
import type { Ticket } from '../../types';

const mockTickets: Ticket[] = [
  {
    id: 1,
    title: 'Implement login page',
    description: 'Build the login form with validation',
    priority: 'HIGH',
    status: 'PENDING',
    team_id: 1,
    creator_id: 2,
    assignee_id: 3,
    assignee_name: 'Alice Johnson',
    created_at: '2024-01-15T10:00:00',
    updated_at: '2024-01-15T12:30:00',
  },
  {
    id: 2,
    title: 'Set up CI pipeline',
    description: 'Configure GitHub Actions for automated testing',
    priority: 'MEDIUM',
    status: 'PENDING',
    team_id: 1,
    creator_id: 2,
    assignee_id: null,
    assignee_name: null,
    created_at: '2024-01-16T09:00:00',
    updated_at: '2024-01-16T09:00:00',
  },
];

describe('KanbanColumn', () => {
  it('renders column title and ticket count in header', () => {
    render(
      <KanbanColumn
        columnId="PENDING"
        title="To Do"
        tickets={mockTickets}
        onDrop={vi.fn()}
        onEditTicket={vi.fn()}
        onDeleteTicket={vi.fn()}
      />
    );
    expect(screen.getByText('To Do (2)')).toBeInTheDocument();
  });

  it('renders zero count when no tickets', () => {
    render(
      <KanbanColumn
        columnId="INPROGRESS"
        title="In Progress"
        tickets={[]}
        onDrop={vi.fn()}
        onEditTicket={vi.fn()}
        onDeleteTicket={vi.fn()}
      />
    );
    expect(screen.getByText('In Progress (0)')).toBeInTheDocument();
  });

  it('renders KanbanCard for each ticket', () => {
    render(
      <KanbanColumn
        columnId="PENDING"
        title="To Do"
        tickets={mockTickets}
        onDrop={vi.fn()}
        onEditTicket={vi.fn()}
        onDeleteTicket={vi.fn()}
      />
    );
    expect(screen.getByText('Implement login page')).toBeInTheDocument();
    expect(screen.getByText('Set up CI pipeline')).toBeInTheDocument();
  });

  it('has accessible aria-label on the column section', () => {
    render(
      <KanbanColumn
        columnId="PENDING"
        title="To Do"
        tickets={mockTickets}
        onDrop={vi.fn()}
        onEditTicket={vi.fn()}
        onDeleteTicket={vi.fn()}
      />
    );
    expect(screen.getByRole('region', { name: 'To Do column' })).toBeInTheDocument();
  });

  it('applies drop-target styles on dragEnter and removes on dragLeave', () => {
    render(
      <KanbanColumn
        columnId="PENDING"
        title="To Do"
        tickets={[]}
        onDrop={vi.fn()}
        onEditTicket={vi.fn()}
        onDeleteTicket={vi.fn()}
      />
    );
    const column = screen.getByRole('region', { name: 'To Do column' });

    // Simulate dragEnter
    fireEvent.dragEnter(column, { preventDefault: vi.fn() });
    expect(column.className).toContain('dropTarget');

    // Simulate dragLeave leaving the column entirely
    fireEvent.dragLeave(column, {
      currentTarget: column,
      relatedTarget: document.body,
    });
    expect(column.className).not.toContain('dropTarget');
  });

  it('calls onDrop with ticket id and columnId when a card is dropped', () => {
    const onDrop = vi.fn();
    render(
      <KanbanColumn
        columnId="INPROGRESS"
        title="In Progress"
        tickets={[]}
        onDrop={onDrop}
        onEditTicket={vi.fn()}
        onDeleteTicket={vi.fn()}
      />
    );
    const column = screen.getByRole('region', { name: 'In Progress column' });

    fireEvent.drop(column, {
      preventDefault: vi.fn(),
      dataTransfer: { getData: () => '5' },
    });

    expect(onDrop).toHaveBeenCalledWith(5, 'INPROGRESS');
  });

  it('does not call onDrop when dataTransfer is empty', () => {
    const onDrop = vi.fn();
    render(
      <KanbanColumn
        columnId="COMPLETED"
        title="Done"
        tickets={[]}
        onDrop={onDrop}
        onEditTicket={vi.fn()}
        onDeleteTicket={vi.fn()}
      />
    );
    const column = screen.getByRole('region', { name: 'Done column' });

    fireEvent.drop(column, {
      preventDefault: vi.fn(),
      dataTransfer: { getData: () => '' },
    });

    expect(onDrop).not.toHaveBeenCalled();
  });

  it('removes drop-target style after a drop', () => {
    render(
      <KanbanColumn
        columnId="PENDING"
        title="To Do"
        tickets={[]}
        onDrop={vi.fn()}
        onEditTicket={vi.fn()}
        onDeleteTicket={vi.fn()}
      />
    );
    const column = screen.getByRole('region', { name: 'To Do column' });

    // First enter to set drop target
    fireEvent.dragEnter(column, { preventDefault: vi.fn() });
    expect(column.className).toContain('dropTarget');

    // Then drop clears it
    fireEvent.drop(column, {
      preventDefault: vi.fn(),
      dataTransfer: { getData: () => '1' },
    });
    expect(column.className).not.toContain('dropTarget');
  });

  it('passes onEditTicket callback through to cards', () => {
    const onEditTicket = vi.fn();
    render(
      <KanbanColumn
        columnId="PENDING"
        title="To Do"
        tickets={[mockTickets[0]]}
        onDrop={vi.fn()}
        onEditTicket={onEditTicket}
        onDeleteTicket={vi.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText(`Edit ticket: ${mockTickets[0].title}`));
    expect(onEditTicket).toHaveBeenCalledWith(mockTickets[0]);
  });

  it('passes onDeleteTicket callback through to cards', () => {
    const onDeleteTicket = vi.fn();
    render(
      <KanbanColumn
        columnId="PENDING"
        title="To Do"
        tickets={[mockTickets[0]]}
        onDrop={vi.fn()}
        onEditTicket={vi.fn()}
        onDeleteTicket={onDeleteTicket}
      />
    );
    fireEvent.click(screen.getByLabelText(`Delete ticket: ${mockTickets[0].title}`));
    expect(onDeleteTicket).toHaveBeenCalledWith(1);
  });
});
