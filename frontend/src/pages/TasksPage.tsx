import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { deleteTask } from '../api/tasks';
import type { Task } from '../types';
import { useAuth } from '../context/AuthContext';
import TaskCard from '../components/TaskCard';
import ErrorBanner from '../components/ErrorBanner';
import Button from '../components/Button';
import styles from './TasksPage.module.css';

function TasksPage() {
  const { token, logout } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [bannerError, setBannerError] = useState<string>('');

  // Fetch tasks with HTTP status code checking for 401 handling
  const fetchTasksWithStatusCheck = useCallback(async (): Promise<void> => {
    if (!token) return;
    setLoading(true);
    setBannerError('');

    let response: Response;
    try {
      response = await fetch(`${import.meta.env.VITE_API_URL}/tasks`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      if (err instanceof TypeError) {
        setBannerError('Unable to connect. Please check your network and try again.');
        setLoading(false);
        return;
      }
      setBannerError('An unexpected error occurred.');
      setLoading(false);
      return;
    }

    if (!response.ok) {
      if (response.status === 401) {
        logout();
        return;
      }
      let msg = 'An error occurred while loading tasks.';
      try {
        const body = await response.json() as { error?: string };
        if (body.error) msg = body.error;
      } catch {
        // ignore parse errors
      }
      setBannerError(msg);
      setLoading(false);
      return;
    }

    const data = await response.json() as Task[];
    setTasks(data);
    setLoading(false);
  }, [token, logout]);

  useEffect(() => {
    void fetchTasksWithStatusCheck();
  }, [fetchTasksWithStatusCheck]);

  const handleDelete = async (id: number): Promise<void> => {
    if (!token) return;
    setBannerError('');

    try {
      await deleteTask(token, id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err: unknown) {
      if (err !== null && typeof err === 'object') {
        const apiErr = err as { error?: string };
        setBannerError(apiErr.error ?? 'Failed to delete task. Please try again.');
      } else {
        setBannerError('Failed to delete task. Please try again.');
      }
    }
  };

  return (
    <div className={styles.page}>
      {bannerError && (
        <ErrorBanner
          message={bannerError}
          onDismiss={() => setBannerError('')}
        />
      )}

      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.heading}>My Tasks</h1>
            <p className={styles.subheading}>
              {loading ? 'Loading your tasks…' : `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Link to="/tasks/new">
            <Button variant="primary" className={styles.newTaskButton}>
              + New Task
            </Button>
          </Link>
        </div>

        <hr className={styles.divider} />

        {loading ? (
          <div className={styles.loadingState}>
            <p className={styles.loadingText}>Loading tasks…</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon} aria-hidden="true">📋</div>
            <h2 className={styles.emptyHeading}>No tasks yet</h2>
            <p className={styles.emptyText}>
              Get started by creating your first task.
            </p>
            <Link to="/tasks/new">
              <Button variant="primary">Create your first task</Button>
            </Link>
          </div>
        ) : (
          <div className={styles.taskGrid}>
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TasksPage;
