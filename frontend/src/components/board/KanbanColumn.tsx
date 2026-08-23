import React, { useState } from 'react';
import type { Ticket, ColumnId, TicketStatus } from '../../types';
import KanbanCard from './KanbanCard';
import styles from './KanbanColumn.module.css';

interface KanbanColumnProps {
  columnId: ColumnId;
  title: string;
  tickets: Ticket[];
  onDrop: (ticketId: number, newStatus: ColumnId) => void;
  onEditTicket: (ticket: Ticket) => void;
  onDeleteTicket: (ticketId: number) => void;
  onMoveTicket?: (ticketId: number, newStatus: TicketStatus) => void;
}

function KanbanColumn({
  columnId,
  title,
  tickets,
  onDrop,
  onEditTicket,
  onDeleteTicket,
  onMoveTicket,
}: KanbanColumnProps) {
  const [isDropTarget, setIsDropTarget] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDropTarget(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Only remove highlight when leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDropTarget(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDropTarget(false);
    const ticketId = e.dataTransfer.getData('text/plain');
    if (ticketId) {
      onDrop(Number(ticketId), columnId);
    }
  };

  return (
    <section
      className={`${styles.column} ${isDropTarget ? styles.dropTarget : ''}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-label={`${title} column`}
    >
      <div className={styles.columnHeader}>
        <span className={styles.headerTitle}>
          {title} ({tickets.length})
        </span>
      </div>
      <div className={styles.cardList}>
        {tickets.map((ticket) => (
          <KanbanCard
            key={ticket.id}
            ticket={ticket}
            columnId={columnId}
            onEdit={onEditTicket}
            onDelete={onDeleteTicket}
            onMove={onMoveTicket}
          />
        ))}
      </div>
    </section>
  );
}

export default KanbanColumn;
