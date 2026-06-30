import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getTasks, updateTask } from '../api/tasks';
import { NetworkError } from '../types';
import type { Priority, TaskStatus, TaskPayload, FieldErrors } from '../types';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Textarea from '../components/Textarea';
import Select from '../components/Select';
import Button from '../components/Button';
import Card from '../components/Card';
import ErrorBanner from '../components/ErrorBanner';
import styles from './EditTaskPage.module.css';

function EditTaskPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();

  // Field state (pre-populated on mount)
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [status, setStatus] = useState<TaskStatus>('PENDING');

  // Error state
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>('');
  const [bannerError, setBannerError] = useState<string>('');

  // Loading states
  const [loadingTask, setLoadingTask] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Network retry
  const [retryPayload, setRetryPayload] = useState<TaskPayload | null>(null);

  const fetchAndPopulate = useCallback(async (): Promise<void> => {
    if (!token || !id) return;
    setLoadingTask(true);
    setBannerError('');

    const taskId = parseInt(id, 10);
    if (isNaN(taskId)) {
      setBannerError('Invalid task ID.');
      setLoadingTask(false);
      return;
    }

    try {
      const tasks = await getTasks(token);
      const task = tasks.find((t) => t.id === taskId);
      if (!task) {
        setBannerError('Task not found.');
        setLoadingTask(false);
        return;
      }
      setTitle(task.title);
      setDescription(task.description);
      setPriority(task.priority);
      setStatus(task.status);
    } catch (err: unknown) {
      if (err instanceof NetworkError) {
        setBannerError(err.message);
      } else if (err !== null && typeof err === 'object') {
        const apiErr = err as { error?: string };
        setBannerError(apiErr.error ?? 'Failed to load task.');
      } else {
        setBannerError('Failed to load task.');
      }
    } finally {
      setLoadingTask(false);
    }
  }, [token, id]);

  useEffect(() => {
    void fetchAndPopulate();
  }, [fetchAndPopulate]);

  const clearFieldError = (field: string): void => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const submitUpdate = async (payload: TaskPayload): Promise<void> => {
    if (!token || !id) return;

    const taskId = parseInt(id, 10);
    if (isNaN(taskId)) return;

    setSubmitting(true);
    setFormError('');
    setRetryPayload(null);

    try {
      await updateTask(token, taskId, payload);
      navigate('/tasks');
    } catch (err: unknown) {
      if (err instanceof NetworkError) {
        setFormError(err.message);
        setRetryPayload(payload);
      } else if (
        err !== null &&
        typeof err === 'object' &&
        'errors' in err &&
        typeof (err as { errors: unknown }).errors === 'object' &&
        (err as { errors: unknown }).errors !== null
      ) {
        // HTTP 400 — field-level errors; preserve all field values (Req 6.6)
        setFieldErrors((err as { errors: FieldErrors }).errors);
      } else if (err !== null && typeof err === 'object') {
        const apiErr = err as { error?: string };
        setBannerError(apiErr.error ?? 'Failed to update task. Please try again.');
      } else {
        setBannerError('Failed to update task. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const payload: TaskPayload = { title, description, priority, status };
    await submitUpdate(payload);
  };

  const handleRetry = async (): Promise<void> => {
    if (!retryPayload) return;
    await submitUpdate(retryPayload);
  };

  if (loadingTask) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <p className={styles.loadingText}>Loading task…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {bannerError && (
        <ErrorBanner
          message={bannerError}
          onDismiss={() => setBannerError('')}
        />
      )}

      <div className={styles.container}>
        <div className={styles.breadcrumb}>
          <Link to="/tasks" className={styles.breadcrumbLink}>← Back to tasks</Link>
        </div>

        <Card className={styles.card}>
          <h1 className={styles.heading}>Edit Task</h1>
          <p className={styles.subheading}>Update the details of your task below.</p>

          <form onSubmit={handleSubmit} noValidate className={styles.form}>
            <Input
              label="Title"
              id="title"
              type="text"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setTitle(e.target.value);
                clearFieldError('title');
              }}
              error={fieldErrors['title']}
              placeholder="Enter task title"
              disabled={submitting}
              maxLength={200}
            />

            <Textarea
              label="Description"
              id="description"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                setDescription(e.target.value);
                clearFieldError('description');
              }}
              error={fieldErrors['description']}
              placeholder="Describe your task…"
              disabled={submitting}
              rows={4}
              maxLength={1000}
            />

            <Select
              label="Priority"
              id="priority"
              value={priority}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setPriority(e.target.value as Priority);
                clearFieldError('priority');
              }}
              error={fieldErrors['priority']}
              disabled={submitting}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </Select>

            <Select
              label="Status"
              id="status"
              value={status}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setStatus(e.target.value as TaskStatus);
                clearFieldError('status');
              }}
              error={fieldErrors['status']}
              disabled={submitting}
            >
              <option value="PENDING">Pending</option>
              <option value="INPROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </Select>

            {formError && (
              <div className={styles.formError} role="alert">
                <span>{formError}</span>
                {retryPayload && (
                  <button
                    type="button"
                    className={styles.retryButton}
                    onClick={handleRetry}
                    disabled={submitting}
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            <div className={styles.actions}>
              <Link to="/tasks">
                <Button type="button" variant="outline" disabled={submitting}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" variant="primary" disabled={submitting} className={styles.submitButton}>
                {submitting ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default EditTaskPage;
