import { useState, useRef, useEffect } from 'react';
import type { Ticket, ColumnId, TicketStatus } from '../../types';
import styles from './KanbanCard.module.css';

interface KanbanCardProps {
  readonly ticket: Ticket;
  readonly columnId: ColumnId;
  readonly onEdit: (ticket: Ticket) => void;
  readonly onDelete: (ticketId: number) => void;
  readonly onMove?: (ticketId: number, newStatus: TicketStatus) => void;
}

const PRIORITY_CLASSES: Record<Ticket['priority'], string> = {
  HIGH: styles.priorityHigh,
  MEDIUM: styles.priorityMedium,
  LOW: styles.priorityLow,
};

const PRIORITY_LABELS: Record<Ticket['priority'], string> = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const ACCENT_CLASSES: Record<ColumnId, string> = {
  PENDING: styles.accentPending,
  INPROGRESS: styles.accentInprogress,
  COMPLETED: styles.accentCompleted,
};

const COLUMN_LABELS: Record<ColumnId, string> = {
  PENDING: 'To Do',
  INPROGRESS: 'In Progress',
  COMPLETED: 'Done',
};

const ALL_STATUSES: TicketStatus[] = ['PENDING', 'INPROGRESS', 'COMPLETED'];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function KanbanCard({ ticket, columnId, onEdit, onDelete, onMove }: KanbanCardProps) {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showMoveMenu, setShowMoveMenu] = useState<boolean>(false);
  const moveMenuRef = useRef<HTMLDivElement>(null);

  // Close move menu when clicking outside
  useEffect(() => {
    if (!showMoveMenu) return;

    function handleClickOutside(event: MouseEvent) {
      if (moveMenuRef.current && !moveMenuRef.current.contains(event.target as Node)) {
        setShowMoveMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMoveMenu]);

  // Close move menu on Escape
  useEffect(() => {
    if (!showMoveMenu) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowMoveMenu(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showMoveMenu]);

  const handleDragStart = (e: React.DragEvent<HTMLElement>): void => {
    e.dataTransfer.setData('text/plain', String(ticket.id));
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = (): void => {
    setIsDragging(false);
  };

  const handleMoveClick = (): void => {
    setShowMoveMenu((prev) => !prev);
  };

  const handleMoveToStatus = (newStatus: TicketStatus): void => {
    setShowMoveMenu(false);
    if (onMove && newStatus !== columnId) {
      onMove(ticket.id, newStatus);
    }
  };

  const availableStatuses = ALL_STATUSES.filter((s) => s !== columnId);

  const cardClassName = [styles.card, isDragging ? styles.dragging : ''].filter(Boolean).join(' ');

  return (
    <article
      className={cardClassName}
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      aria-label={`Ticket: ${ticket.title}`}
    >
      {/* Left accent bar */}
      <span
        className={`${styles.accentBar} ${ACCENT_CLASSES[columnId]}`}
        aria-hidden="true"
      />

      {/* Action buttons (visible on hover) */}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => onEdit(ticket)}
          aria-label={`Edit ticket: ${ticket.title}`}
          title="Edit"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => onDelete(ticket.id)}
          aria-label={`Delete ticket: ${ticket.title}`}
          title="Delete"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>

      {/* Title */}
      <div className={styles.titleRow}>
        <h3 className={styles.title}>{ticket.title}</h3>
      </div>

      {/* Description (2 lines max) */}
      <p className={styles.description}>{ticket.description}</p>

      {/* Assignee */}
      <div className={styles.assignee}>
        {ticket.assignee_name ? (
          <>
            <span className={styles.avatar} aria-hidden="true">
              {getInitials(ticket.assignee_name)}
            </span>
            <span className={styles.assigneeName}>{ticket.assignee_name}</span>
          </>
        ) : (
          <span className={styles.unassigned}>Unassigned</span>
        )}
      </div>

      {/* Footer: priority badge + move */}
      <div className={styles.footer}>
        <span
          className={`${styles.priorityBadge} ${PRIORITY_CLASSES[ticket.priority]}`}
          aria-label={`Priority: ${PRIORITY_LABELS[ticket.priority]}`}
        >
          {PRIORITY_LABELS[ticket.priority]}
        </span>

        {onMove && (
          <div className={styles.moveWrapper} ref={moveMenuRef}>
            <button
              type="button"
              className={styles.moveButton}
              onClick={handleMoveClick}
              aria-label={`Move ticket "${ticket.title}" to another column`}
              aria-expanded={showMoveMenu}
              aria-haspopup="true"
            >
              Move to…
            </button>
            {showMoveMenu && (
              <div className={styles.moveMenu} role="menu" aria-label="Move to column">
                {availableStatuses.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={styles.moveMenuItem}
                    role="menuitem"
                    onClick={() => handleMoveToStatus(status)}
                  >
                    {COLUMN_LABELS[status]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export default KanbanCard;
