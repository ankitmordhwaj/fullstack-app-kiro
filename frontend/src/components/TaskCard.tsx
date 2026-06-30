import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Task } from '../types/index';
import ConfirmDialog from './ConfirmDialog';
import styles from './TaskCard.module.css';

interface TaskCardProps {
  readonly task: Task;
  readonly onDelete: (id: number) => void;
}

const PRIORITY_LABELS: Record<Task['priority'], string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

const PRIORITY_CLASSES: Record<Task['priority'], string> = {
  LOW: styles.priorityLow,
  MEDIUM: styles.priorityMedium,
  HIGH: styles.priorityHigh,
};

const STATUS_LABELS: Record<Task['status'], string> = {
  PENDING: 'Pending',
  INPROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

const STATUS_CLASSES: Record<Task['status'], string> = {
  PENDING: styles.statusPending,
  INPROGRESS: styles.statusInprogress,
  COMPLETED: styles.statusCompleted,
};

function TaskCard({ task, onDelete }: TaskCardProps) {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState<boolean>(false);

  const handleEditClick = (): void => {
    navigate(`/tasks/${task.id}/edit`);
  };

  const handleDeleteClick = (): void => {
    setShowConfirm(true);
  };

  const handleConfirmDelete = (): void => {
    setShowConfirm(false);
    onDelete(task.id);
  };

  const handleCancelDelete = (): void => {
    setShowConfirm(false);
  };

  return (
    <>
      <article className={styles.card} aria-label={`Task: ${task.title}`}>
        <div className={styles.header}>
          <h3 className={styles.title}>{task.title}</h3>
          <div className={styles.badges}>
            <span
              className={[styles.badge, PRIORITY_CLASSES[task.priority]].join(' ')}
              aria-label={`Priority: ${PRIORITY_LABELS[task.priority]}`}
            >
              {PRIORITY_LABELS[task.priority]}
            </span>
            <span
              className={[styles.badge, STATUS_CLASSES[task.status]].join(' ')}
              aria-label={`Status: ${STATUS_LABELS[task.status]}`}
            >
              {STATUS_LABELS[task.status]}
            </span>
          </div>
        </div>

        <p className={styles.description}>{task.description}</p>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.editButton}
            onClick={handleEditClick}
            aria-label={`Edit task: ${task.title}`}
          >
            Edit
          </button>
          <button
            type="button"
            className={styles.deleteButton}
            onClick={handleDeleteClick}
            aria-label={`Delete task: ${task.title}`}
          >
            Delete
          </button>
        </div>
      </article>

      {showConfirm && (
        <ConfirmDialog
          message={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </>
  );
}

export default TaskCard;
