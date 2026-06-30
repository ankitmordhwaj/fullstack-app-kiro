import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createTask } from '../api/tasks';
import { NetworkError } from '../types';
import type { Priority, TaskStatus, TaskPayload, FieldErrors } from '../types';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Textarea from '../components/Textarea';
import Select from '../components/Select';
import Button from '../components/Button';
import Card from '../components/Card';
import styles from './CreateTaskPage.module.css';

function CreateTaskPage() {
  const navigate = useNavigate();
  const { token } = useAuth();

  // Field state
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [status, setStatus] = useState<TaskStatus>('PENDING');

  // Error state
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>('');

  // Loading / network retry
  const [loading, setLoading] = useState<boolean>(false);
  const [retryPayload, setRetryPayload] = useState<TaskPayload | null>(null);

  const clearFieldError = (field: string): void => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateClientSide = (): boolean => {
    const errors: FieldErrors = {};
    if (!title.trim()) errors['title'] = 'Title is required.';
    if (!description.trim()) errors['description'] = 'Description is required.';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return false;
    }
    return true;
  };

  const submitCreate = async (payload: TaskPayload): Promise<void> => {
    if (!token) return;

    setLoading(true);
    setFormError('');
    setRetryPayload(null);

    try {
      await createTask(token, payload);
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
        // HTTP 400 — field-level errors
        setFieldErrors((err as { errors: FieldErrors }).errors);
      } else if (
        err !== null &&
        typeof err === 'object' &&
        'error' in err &&
        typeof (err as { error: unknown }).error === 'string'
      ) {
        setFormError((err as { error: string }).error);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!validateClientSide()) return;

    const payload: TaskPayload = { title, description, priority, status };
    await submitCreate(payload);
  };

  const handleRetry = async (): Promise<void> => {
    if (!retryPayload) return;
    await submitCreate(retryPayload);
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.breadcrumb}>
          <Link to="/tasks" className={styles.breadcrumbLink}>← Back to tasks</Link>
        </div>

        <Card className={styles.card}>
          <h1 className={styles.heading}>Create New Task</h1>
          <p className={styles.subheading}>Fill in the details to add a new task to your list.</p>

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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
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
                    disabled={loading}
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            <div className={styles.actions}>
              <Link to="/tasks">
                <Button type="button" variant="outline" disabled={loading}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" variant="primary" disabled={loading} className={styles.submitButton}>
                {loading ? 'Creating…' : 'Create Task'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default CreateTaskPage;
