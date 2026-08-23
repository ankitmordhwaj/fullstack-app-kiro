import type { Ticket, ColumnId, TicketStatus } from '../../types';
import KanbanColumn from './KanbanColumn';
import styles from './KanbanBoard.module.css';

interface KanbanBoardProps {
  tickets: Ticket[];
  onDrop: (ticketId: number, newStatus: ColumnId) => void;
  onEditTicket: (ticket: Ticket) => void;
  onDeleteTicket: (ticketId: number) => void;
  onMoveTicket?: (ticketId: number, newStatus: TicketStatus) => void;
}

const COLUMNS: { id: ColumnId; title: string }[] = [
  { id: 'PENDING', title: 'To Do' },
  { id: 'INPROGRESS', title: 'In Progress' },
  { id: 'COMPLETED', title: 'Done' },
];

function KanbanBoard({
  tickets,
  onDrop,
  onEditTicket,
  onDeleteTicket,
  onMoveTicket,
}: KanbanBoardProps) {
  const ticketsByStatus = (status: ColumnId): Ticket[] =>
    tickets.filter((ticket) => ticket.status === status);

  return (
    <div className={styles.board}>
      {COLUMNS.map((column) => (
        <KanbanColumn
          key={column.id}
          columnId={column.id}
          title={column.title}
          tickets={ticketsByStatus(column.id)}
          onDrop={onDrop}
          onEditTicket={onEditTicket}
          onDeleteTicket={onDeleteTicket}
          onMoveTicket={onMoveTicket}
        />
      ))}
    </div>
  );
}

export default KanbanBoard;
