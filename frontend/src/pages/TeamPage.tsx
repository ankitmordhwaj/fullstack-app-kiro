import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTeamMembers, sendInvite } from '../api/teams';
import { NetworkError } from '../types';
import type { TeamMember, PendingInvitation } from '../types';
import styles from './TeamPage.module.css';

function TeamPage() {
  const { token } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteError, setInviteError] = useState<string>('');
  const [inviteLoading, setInviteLoading] = useState<boolean>(false);
  const [inviteSuccess, setInviteSuccess] = useState<string>('');

  const fetchTeamMembers = async (): Promise<void> => {
    if (!token) return;
    try {
      const data = await getTeamMembers(token);
      setMembers(data.members);
      setPendingInvitations(data.pending_invitations);
      setError('');
    } catch (err: unknown) {
      if (err instanceof NetworkError) {
        setError(err.message);
      } else if (typeof err === 'object' && err !== null && 'error' in err) {
        setError((err as { error: string }).error);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, [token]);

  const validateEmail = (email: string): string => {
    const trimmed = email.trim();
    if (!trimmed) {
      return 'Email is required.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return 'Please enter a valid email address.';
    }
    return '';
  };

  const handleInviteSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setInviteSuccess('');
    setInviteError('');

    const validationError = validateEmail(inviteEmail);
    if (validationError) {
      setInviteError(validationError);
      return;
    }

    if (!token) return;

    setInviteLoading(true);

    try {
      await sendInvite(token, inviteEmail.trim());
      setInviteEmail('');
      setInviteSuccess('Invitation sent successfully!');
      // Refresh the team members list
      await fetchTeamMembers();
      setTimeout(() => setInviteSuccess(''), 3000);
    } catch (err: unknown) {
      if (err instanceof NetworkError) {
        setInviteError(err.message);
      } else if (typeof err === 'object' && err !== null && 'error' in err) {
        setInviteError((err as { error: string }).error);
      } else {
        setInviteError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setInviteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loadingText}>Loading team members...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Team Members</h1>

      {error && (
        <div className={styles.errorBanner} role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      {/* Confirmed Members Section */}
      <section className={styles.card} aria-labelledby="members-heading">
        <h2 id="members-heading" className={styles.sectionTitle}>Members</h2>
        {members.length === 0 ? (
          <p className={styles.emptyMessage}>
            Your team is empty. Invite someone to get started!
          </p>
        ) : (
          <div>
            {members.map((member) => (
              <div key={member.id} className={styles.memberItem}>
                <div className={styles.memberInfo}>
                  <span className={styles.memberName}>{member.full_name}</span>
                  <span className={styles.memberEmail}>{member.email}</span>
                </div>
                <span className={styles.roleBadge}>{member.role}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pending Invitations Section */}
      {pendingInvitations.length > 0 && (
        <section className={styles.card} aria-labelledby="pending-heading">
          <h2 id="pending-heading" className={styles.sectionTitle}>Pending Invitations</h2>
          <div>
            {pendingInvitations.map((invitation) => (
              <div key={invitation.id} className={styles.memberItem}>
                <div className={styles.memberInfo}>
                  <span className={styles.memberEmail}>{invitation.email}</span>
                </div>
                <span className={styles.pendingLabel}>Invite Sent</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Invite Form Section */}
      <section className={styles.card} aria-labelledby="invite-heading">
        <h2 id="invite-heading" className={styles.sectionTitle}>Invite a Member</h2>
        <form onSubmit={handleInviteSubmit} noValidate>
          <div className={styles.inviteForm}>
            <input
              type="email"
              className={[styles.input, inviteError ? styles.inputError : ''].join(' ').trim()}
              value={inviteEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setInviteEmail(e.target.value);
                if (inviteError) {
                  setInviteError('');
                }
              }}
              placeholder="Enter email address"
              aria-label="Email address to invite"
              aria-invalid={!!inviteError}
              aria-describedby={inviteError ? 'invite-error' : undefined}
            />
            <button
              type="submit"
              className={styles.submitButton}
              disabled={inviteLoading}
            >
              {inviteLoading ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
          {inviteError && (
            <p id="invite-error" className={styles.fieldError} role="alert">
              {inviteError}
            </p>
          )}
          {inviteSuccess && (
            <p className={styles.successMessage} role="status" aria-live="polite">
              {inviteSuccess}
            </p>
          )}
        </form>
      </section>
    </div>
  );
}

export default TeamPage;
