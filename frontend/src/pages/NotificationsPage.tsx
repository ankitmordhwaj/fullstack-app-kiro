import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getNotifications } from '../api/notifications';
import { acceptInvitation, declineInvitation } from '../api/invitations';
import { NetworkError } from '../types';
import type { Notification } from '../types';
import styles from './NotificationsPage.module.css';

function NotificationsPage() {
  const { token } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!token) return;

    getNotifications(token)
      .then((data) => {
        const sorted = [...data.notifications].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setNotifications(sorted);
      })
      .catch((err) => {
        if (err instanceof NetworkError) {
          setError(err.message);
        } else if (err && typeof err === 'object' && 'error' in err) {
          setError((err as { error: string }).error);
        } else {
          setError('Failed to load notifications.');
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async (notificationId: number, invitationId: number) => {
    if (!token) return;
    setActionError(null);
    setActionLoading((prev) => ({ ...prev, [notificationId]: true }));

    try {
      await acceptInvitation(token, invitationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, invitation_status: 'accepted' } : n
        )
      );
    } catch (err) {
      if (err instanceof NetworkError) {
        setActionError(err.message);
      } else if (err && typeof err === 'object' && 'error' in err) {
        setActionError((err as { error: string }).error);
      } else {
        setActionError('Failed to accept invitation.');
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [notificationId]: false }));
    }
  };

  const handleDecline = async (notificationId: number, invitationId: number) => {
    if (!token) return;
    setActionError(null);
    setActionLoading((prev) => ({ ...prev, [notificationId]: true }));

    try {
      await declineInvitation(token, invitationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, invitation_status: 'declined' } : n
        )
      );
    } catch (err) {
      if (err instanceof NetworkError) {
        setActionError(err.message);
      } else if (err && typeof err === 'object' && 'error' in err) {
        setActionError((err as { error: string }).error);
      } else {
        setActionError('Failed to decline invitation.');
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [notificationId]: false }));
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loadingText}>Loading notifications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBanner} role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Notifications</h1>

      {actionError && (
        <div className={styles.errorBanner} role="alert">
          {actionError}
        </div>
      )}

      {notifications.length === 0 ? (
        <p className={styles.emptyMessage}>No notifications yet.</p>
      ) : (
        notifications.map((notification) => (
          <div key={notification.id} className={styles.notificationCard}>
            <div className={styles.notificationContent}>
              <p className={styles.notificationMessage}>{notification.message}</p>
              <p className={styles.notificationDate}>
                {new Date(notification.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className={styles.actions}>
              {notification.invitation_status === 'pending' && (
                <>
                  <button
                    type="button"
                    className={styles.acceptButton}
                    disabled={!!actionLoading[notification.id]}
                    onClick={() => handleAccept(notification.id, notification.invitation_id)}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className={styles.declineButton}
                    disabled={!!actionLoading[notification.id]}
                    onClick={() => handleDecline(notification.id, notification.invitation_id)}
                  >
                    Decline
                  </button>
                </>
              )}
              {notification.invitation_status === 'accepted' && (
                <span className={`${styles.statusLabel} ${styles.acceptedLabel}`}>
                  Accepted
                </span>
              )}
              {notification.invitation_status === 'declined' && (
                <span className={`${styles.statusLabel} ${styles.declinedLabel}`}>
                  Declined
                </span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default NotificationsPage;
