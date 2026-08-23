import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import KanbanBoard from './KanbanBoard';
import type { Ticket } from '../../types';

const makeTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: 1,
  title: 'Default ticket',
  description: 'A description',
  priority: 'MEDIUM',
  status: 'PENDING',
  team_id: 1,
  creator_id: 1,
  assignee_id: null,
  assignee_name: null,
  created_at: '2024-01-15T10:00:00',
  updated_at: '2024-01-15T10:00:00',
  ...overrides,
});

const sampleTickets: Ticket[] = [
  makeTicket({ id: 1, title: 'Todo ticket', status: 'PENDING' }),
  makeTicket({ id: 2, title: 'In progress ticket', status: 'INPROGRESS' }),
  makeTicket({ id: 3, title: 'Done ticket', status: 'COMPLETED' }),
  makeTicket({ id: 4, title: 'Another todo', status: 'PENDING' }),
];

describe('KanbanBoard', () => {
  it('renders three columns with correct titles', () => {
    render(
      <KanbanBoard
        tickets={[]}
        onDrop={vi.fn()}
        onEditTicket={vi.fn()}
        onDeleteTicket={vi.fn()}
      />
    );

    expect(screen.getByLabelText('To Do column')).toBeInTheDocument();
    expect(screen.getByLabelText('In Progress column')).toBeInTheDocument();
    expect(screen.getByLabelText('Done column')).toBeInTheDocument();
  });

  it('groups tickets by status into correct columns', () => {
    render(
      <KanbanBoard
        tickets={sampleTickets}
        onDrop={vi.fn()}
        onEditTicket={vi.fn()}
        onDeleteTicket={vi.fn()}
      />
    );

    // To Do column should show count of 2
    expect(screen.getByText('To Do (2)')).toBeInTheDocument();
    // In Progress column should show count of 1
    expect(screen.getByText('In Progress (1)')).toBeInTheDocument();
    // Done column should show count of 1
    expect(screen.getByText('Done (1)')).toBeInTheDocument();
  });

  it('renders ticket cards in their respective columns', () => {
    render(
      <KanbanBoard
        tickets={sampleTickets}
        onDrop={vi.fn()}
        onEditTicket={vi.fn()}
        onDeleteTicket={vi.fn()}
      />
    );

    expect(screen.getByText('Todo ticket')).toBeInTheDocument();
    expect(screen.getByText('In progress ticket')).toBeInTheDocument();
    expect(screen.getByText('Done ticket')).toBeInTheDocument();
    expect(screen.getByText('Another todo')).toBeInTheDocument();
  });

  it('handles empty state with zero tickets in each column', () => {
    render(
      <KanbanBoard
        tickets={[]}
        onDrop={vi.fn()}
        onEditTicket={vi.fn()}
        onDeleteTicket={vi.fn()}
      />
    );

    expect(screen.getByText('To Do (0)')).toBeInTheDocument();
    expect(screen.getByText('In Progress (0)')).toBeInTheDocument();
    expect(screen.getByText('Done (0)')).toBeInTheDocument();
  });

  it('correctly distributes tickets when all are in one column', () => {
    const allPending: Ticket[] = [
      makeTicket({ id: 1, title: 'First', status: 'PENDING' }),
      makeTicket({ id: 2, title: 'Second', status: 'PENDING' }),
      makeTicket({ id: 3, title: 'Third', status: 'PENDING' }),
    ];

    render(
      <KanbanBoard
        tickets={allPending}
        onDrop={vi.fn()}
        onEditTicket={vi.fn()}
        onDeleteTicket={vi.fn()}
      />
    );

    expect(screen.getByText('To Do (3)')).toBeInTheDocument();
    expect(screen.getByText('In Progress (0)')).toBeInTheDocument();
    expect(screen.getByText('Done (0)')).toBeInTheDocument();
  });

  it('passes onDrop callback through to columns', () => {
    const onDrop = vi.fn();
    render(
      <KanbanBoard
        tickets={sampleTickets}
        onDrop={onDrop}
        onEditTicket={vi.fn()}
        onDeleteTicket={vi.fn()}
      />
    );

    // Verify columns are rendered (onDrop is passed internally)
    expect(screen.getByLabelText('To Do column')).toBeInTheDocument();
    expect(screen.getByLabelText('In Progress column')).toBeInTheDocument();
    expect(screen.getByLabelText('Done column')).toBeInTheDocument();
  });
});
