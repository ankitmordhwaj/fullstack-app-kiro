import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTeamMembers, sendInvite, removeMember } from '../api/teams';
import { cancelInvitation } from '../api/invitations';
import { NetworkError } from '../types';
import type { TeamMember, PendingInvitation } from '../types';
import ConfirmDialog from '../components/ConfirmDialog';
import styles from './TeamPage.module.css';

function TeamPage() {
  const { token, user } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteError, setInviteError] = useState<string>('');
  const [inviteLoading, setInviteLoading] = useState<boolean>(false);
  const [inviteSuccess, setInviteSuccess] = useState<string>('');

  // Remove member state
  const [showRemoveDialog, setShowRemoveDialog] = useState<boolean>(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);
  const [removeError, setRemoveError] = useState<string>('');

  // Cancel invitation state
  const [showCancelDialog, setShowCancelDialog] = useState<boolean>(false);
  const [invitationToCancel, setInvitationToCancel] = useState<PendingInvitation | null>(null);
  const [cancellingInvitationId, setCancellingInvitationId] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState<string>('');

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

  // Determine if current user is the team owner
  const isCurrentUserOwner = members.some(
    (member) => member.role === 'owner' && member.id === user?.id
  );

  const handleRemoveClick = (member: TeamMember): void => {
    setMemberToRemove(member);
    setShowRemoveDialog(true);
    setRemoveError('');
  };

  const handleRemoveConfirm = async (): Promise<void> => {
    if (!token || !memberToRemove) return;

    setRemovingMemberId(memberToRemove.id);

    try {
      await removeMember(token, memberToRemove.id);
      setMembers((prev) => prev.filter((m) => m.id !== memberToRemove.id));
      setShowRemoveDialog(false);
      setMemberToRemove(null);
    } catch (err: unknown) {
      if (err instanceof NetworkError) {
        setRemoveError(err.message);
      } else if (typeof err === 'object' && err !== null && 'error' in err) {
        setRemoveError((err as { error: string }).error);
      } else {
        setRemoveError('An unexpected error occurred. Please try again.');
      }
      setShowRemoveDialog(false);
      setMemberToRemove(null);
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleRemoveCancel = (): void => {
    setShowRemoveDialog(false);
    setMemberToRemove(null);
  };

  const handleCancelInvitationClick = (invitation: PendingInvitation): void => {
    setInvitationToCancel(invitation);
    setShowCancelDialog(true);
    setCancelError('');
  };

  const handleCancelInvitationConfirm = async (): Promise<void> => {
    if (!token || !invitationToCancel) return;

    setCancellingInvitationId(invitationToCancel.id);
    setShowCancelDialog(false);

    try {
      await cancelInvitation(token, invitationToCancel.id);
      setPendingInvitations((prev) => prev.filter((inv) => inv.id !== invitationToCancel.id));
      setInvitationToCancel(null);
    } catch (err: unknown) {
      if (err instanceof NetworkError) {
        setCancelError(err.message);
      } else if (typeof err === 'object' && err !== null && 'error' in err) {
        setCancelError((err as { error: string }).error);
      } else {
        setCancelError('An unexpected error occurred. Please try again.');
      }
      setInvitationToCancel(null);
    } finally {
      setCancellingInvitationId(null);
    }
  };

  const handleCancelInvitationDismiss = (): void => {
    setShowCancelDialog(false);
    setInvitationToCancel(null);
  };

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

      {removeError && (
        <div className={styles.errorBanner} role="alert" aria-live="assertive">
          {removeError}
          <button
            type="button"
            className={styles.dismissButton}
            onClick={() => setRemoveError('')}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {cancelError && (
        <div className={styles.errorBanner} role="alert" aria-live="assertive">
          {cancelError}
          <button
            type="button"
            className={styles.dismissButton}
            onClick={() => setCancelError('')}
            aria-label="Dismiss error"
          >
            ×
          </button>
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
                <div className={styles.memberActions}>
                  <span className={styles.roleBadge}>{member.role}</span>
                  {isCurrentUserOwner && member.role === 'member' && (
                    <button
                      type="button"
                      className={styles.removeButton}
                      aria-label={`Remove ${member.full_name}`}
                      onClick={() => handleRemoveClick(member)}
                      disabled={removingMemberId === member.id}
                    >
                      Remove
                    </button>
                  )}
                </div>
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
                <div className={styles.memberActions}>
                  <span className={styles.pendingLabel}>Invite Sent</span>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    aria-label={`Cancel invitation to ${invitation.email}`}
                    onClick={() => handleCancelInvitationClick(invitation)}
                    disabled={cancellingInvitationId === invitation.id}
                  >
                    {cancellingInvitationId === invitation.id ? 'Cancelling...' : 'Cancel'}
                  </button>
                </div>
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

      {/* Remove Member Confirmation Dialog */}
      {showRemoveDialog && memberToRemove && (
        <ConfirmDialog
          message={`Are you sure you want to remove ${memberToRemove.full_name} from the team?`}
          onConfirm={handleRemoveConfirm}
          onCancel={handleRemoveCancel}
        />
      )}

      {/* Cancel Invitation Confirmation Dialog */}
      {showCancelDialog && invitationToCancel && (
        <ConfirmDialog
          message={`Are you sure you want to cancel the invitation to ${invitationToCancel.email}?`}
          onConfirm={handleCancelInvitationConfirm}
          onCancel={handleCancelInvitationDismiss}
        />
      )}
    </div>
  );
}

export default TeamPage;
