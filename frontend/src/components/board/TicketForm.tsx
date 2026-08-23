import { useState, useEffect } from 'react';
import type { Ticket, TicketPayload, TicketPriority, TicketStatus, TeamMemberInfo } from '../../types';
import styles from './TicketForm.module.css';

interface TicketFormProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (data: TicketPayload) => Promise<void>;
  readonly editingTicket?: Ticket | null;
  readonly members: TeamMemberInfo[];
  readonly errors?: Record<string, string>;
}

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'INPROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
];

function TicketForm({ isOpen, onClose, onSubmit, editingTicket, members, errors: apiErrors }: TicketFormProps) {
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const [status, setStatus] = useState<TicketStatus>('PENDING');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const isEditMode = Boolean(editingTicket);

  // Pre-fill form when editing
  useEffect(() => {
    if (editingTicket) {
      setTitle(editingTicket.title);
      setDescription(editingTicket.description);
      setPriority(editingTicket.priority);
      setStatus(editingTicket.status);
      setAssigneeId(editingTicket.assignee_id ? String(editingTicket.assignee_id) : '');
    } else {
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setStatus('PENDING');
      setAssigneeId('');
    }
    setClientErrors({});
  }, [editingTicket, isOpen]);

  if (!isOpen) return null;

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!title.trim()) {
      errs.title = 'Title is required.';
    } else if (title.trim().length > 200) {
      errs.title = 'Title must be 200 characters or less.';
    }
    if (!description.trim()) {
      errs.description = 'Description is required.';
    } else if (description.trim().length > 1000) {
      errs.description = 'Description must be 1000 characters or less.';
    }
    return errs;
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setClientErrors(validationErrors);
      return;
    }

    setClientErrors({});
    setSubmitting(true);

    const payload: TicketPayload = {
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      assignee_id: assigneeId ? Number(assigneeId) : null,
    };

    try {
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleOverlayKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Merge client-side and API errors (API errors take precedence)
  const fieldErrors: Record<string, string> = apiErrors
    ? { ...clientErrors, ...apiErrors }
    : { ...clientErrors };

  let submitLabel = 'Create Ticket';
  if (submitting) {
    submitLabel = 'Saving...';
  } else if (isEditMode) {
    submitLabel = 'Update Ticket';
  }

  return (
    <div className={styles.overlay} onClick={handleOverlayClick} onKeyDown={handleOverlayKeyDown} role="dialog" aria-modal="true" aria-labelledby="ticket-form-title" tabIndex={-1}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 id="ticket-form-title" className={styles.heading}>
            {isEditMode ? 'Edit Ticket' : 'Create Ticket'}
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close form"
          >
            ×
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {/* Title field */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="ticket-title">Title</label>
            <input
              id="ticket-title"
              type="text"
              className={`${styles.input} ${fieldErrors.title ? styles.inputError : ''}`}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (clientErrors.title) {
                  setClientErrors((prev) => { const next = { ...prev }; delete next.title; return next; });
                }
              }}
              placeholder="Enter ticket title"
              maxLength={200}
            />
            {fieldErrors.title && <p className={styles.errorText}>{fieldErrors.title}</p>}
          </div>

          {/* Description field */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="ticket-description">Description</label>
            <textarea
              id="ticket-description"
              className={`${styles.textarea} ${fieldErrors.description ? styles.inputError : ''}`}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (clientErrors.description) {
                  setClientErrors((prev) => { const next = { ...prev }; delete next.description; return next; });
                }
              }}
              placeholder="Enter ticket description"
              maxLength={1000}
            />
            {fieldErrors.description && <p className={styles.errorText}>{fieldErrors.description}</p>}
          </div>

          {/* Priority dropdown */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="ticket-priority">Priority</label>
            <select
              id="ticket-priority"
              className={`${styles.select} ${fieldErrors.priority ? styles.inputError : ''}`}
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {fieldErrors.priority && <p className={styles.errorText}>{fieldErrors.priority}</p>}
          </div>

          {/* Status dropdown */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="ticket-status">Status</label>
            <select
              id="ticket-status"
              className={`${styles.select} ${fieldErrors.status ? styles.inputError : ''}`}
              value={status}
              onChange={(e) => setStatus(e.target.value as TicketStatus)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {fieldErrors.status && <p className={styles.errorText}>{fieldErrors.status}</p>}
          </div>

          {/* Assignee dropdown */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="ticket-assignee">Assignee</label>
            <select
              id="ticket-assignee"
              className={`${styles.select} ${fieldErrors.assignee_id ? styles.inputError : ''}`}
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.id} value={String(member.id)}>{member.full_name}</option>
              ))}
            </select>
            {fieldErrors.assignee_id && <p className={styles.errorText}>{fieldErrors.assignee_id}</p>}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={submitting}
          >
            {submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}

export default TicketForm;
