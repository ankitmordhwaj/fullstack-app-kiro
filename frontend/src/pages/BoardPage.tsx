import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTickets, createTicket, updateTicket, deleteTicket, getTeamMembers } from '../api/tickets';
import KanbanBoard from '../components/board/KanbanBoard';
import TicketForm from '../components/board/TicketForm';
import AssigneeFilter from '../components/board/AssigneeFilter';
import type { Ticket, TicketPayload, ColumnId, TeamMemberInfo } from '../types';
import styles from './BoardPage.module.css';

function BoardPage() {
  const { token } = useAuth();

  // State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [members, setMembers] = useState<TeamMemberInfo[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<string | null>(null);

  // Fetch data on mount
  const fetchData = useCallback(async (): Promise<void> => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const [ticketsData, membersData] = await Promise.all([
        getTickets(token),
        getTeamMembers(token),
      ]);
      setTickets(ticketsData);
      setMembers(membersData);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'object' && err !== null && 'error' in err) {
        setError((err as { error: string }).error);
      } else {
        setError('Failed to load board data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Show error notification for a duration
  const showNotification = (message: string): void => {
    setNotification(message);
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Handle drag-and-drop with optimistic update
  const handleDrop = async (ticketId: number, newStatus: ColumnId): Promise<void> => {
    if (!token) return;

    // Find the ticket
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    // Same-column drop — ignore
    if (ticket.status === newStatus) return;

    // Save previous state for rollback
    const previousTickets = [...tickets];

    // Optimistic update
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId ? { ...t, status: newStatus } : t
      )
    );

    try {
      const updatedTicket = await updateTicket(token, ticketId, { status: newStatus });
      // Replace with server-confirmed data
      setTickets((prev) =>
        prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
      );
    } catch {
      // Revert on failure
      setTickets(previousTickets);
      showNotification('Failed to move ticket. Please try again.');
    }
  };

  // Handle create ticket
  const handleCreateSubmit = async (data: TicketPayload): Promise<void> => {
    if (!token) return;
    setFormErrors({});

    try {
      const newTicket = await createTicket(token, data);
      setTickets((prev) => [newTicket, ...prev]);
      setFormOpen(false);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errors' in err) {
        setFormErrors((err as { errors: Record<string, string> }).errors);
      } else if (err instanceof Error) {
        showNotification(err.message);
      } else {
        showNotification('Failed to create ticket. Please try again.');
      }
    }
  };

  // Handle edit ticket
  const handleEditSubmit = async (data: TicketPayload): Promise<void> => {
    if (!token || !editingTicket) return;
    setFormErrors({});

    try {
      const updatedTicket = await updateTicket(token, editingTicket.id, data);
      setTickets((prev) =>
        prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
      );
      setEditingTicket(null);
      setFormOpen(false);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'errors' in err) {
        setFormErrors((err as { errors: Record<string, string> }).errors);
      } else if (err instanceof Error) {
        showNotification(err.message);
      } else {
        showNotification('Failed to update ticket. Please try again.');
      }
    }
  };

  // Handle open edit form
  const handleEditTicket = (ticket: Ticket): void => {
    setEditingTicket(ticket);
    setFormErrors({});
    setFormOpen(true);
  };

  // Handle delete ticket
  const handleDeleteTicket = async (ticketId: number): Promise<void> => {
    if (!token) return;

    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    const confirmed = window.confirm(`Are you sure you want to delete "${ticket.title}"?`);
    if (!confirmed) return;

    try {
      await deleteTicket(token, ticketId);
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    } catch (err: unknown) {
      if (err instanceof Error) {
        showNotification(err.message);
      } else {
        showNotification('Failed to delete ticket. Please try again.');
      }
    }
  };

  // Handle keyboard-accessible move
  const handleMoveTicket = async (ticketId: number, newStatus: ColumnId): Promise<void> => {
    await handleDrop(ticketId, newStatus);
  };

  // Handle open create form
  const handleAddClick = (): void => {
    setEditingTicket(null);
    setFormErrors({});
    setFormOpen(true);
  };

  // Handle close form
  const handleFormClose = (): void => {
    setFormOpen(false);
    setEditingTicket(null);
    setFormErrors({});
  };

  // Apply assignee filter
  const filteredTickets: Ticket[] =
    selectedAssignees.length === 0
      ? tickets
      : tickets.filter(
          (t) => t.assignee_id !== null && selectedAssignees.includes(t.assignee_id)
        );

  // Loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Loading board...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={fetchData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Board</h1>
        <button type="button" className={styles.addBtn} onClick={handleAddClick}>
          Add Ticket
        </button>
      </div>

      <AssigneeFilter
        members={members}
        selectedAssigneeIds={selectedAssignees}
        onChange={setSelectedAssignees}
      />

      <KanbanBoard
        tickets={filteredTickets}
        onDrop={handleDrop}
        onEditTicket={handleEditTicket}
        onDeleteTicket={handleDeleteTicket}
        onMoveTicket={handleMoveTicket}
      />

      <TicketForm
        isOpen={formOpen}
        onClose={handleFormClose}
        onSubmit={editingTicket ? handleEditSubmit : handleCreateSubmit}
        editingTicket={editingTicket}
        members={members}
        errors={formErrors}
      />

      {notification && (
        <div className={styles.notification} role="alert">
          {notification}
        </div>
      )}
    </div>
  );
}

export default BoardPage;
