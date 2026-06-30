import { useEffect, useRef } from 'react';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  readonly message: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (el && !el.open) {
      el.showModal();
    }

    const handleCancel = (e: Event): void => {
      e.preventDefault();
      onCancel();
    };

    el?.addEventListener('cancel', handleCancel);
    return () => {
      el?.removeEventListener('cancel', handleCancel);
    };
  }, [onCancel]);

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="confirm-dialog-message">
      <p id="confirm-dialog-message" className={styles.message}>
        {message}
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.cancelButton} onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className={styles.confirmButton} onClick={onConfirm}>
          Confirm
        </button>
      </div>
    </dialog>
  );
}

export default ConfirmDialog;
