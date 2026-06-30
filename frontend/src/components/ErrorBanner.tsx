
import styles from './ErrorBanner.module.css';

interface ErrorBannerProps {
  readonly message: string;
  readonly onDismiss: () => void;
}

function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className={styles.banner} role="alert" aria-live="assertive">
      <span className={styles.message}>{message}</span>
      <button
        type="button"
        className={styles.dismissButton}
        onClick={onDismiss}
        aria-label="Dismiss error"
      >
        &times;
      </button>
    </div>
  );
}

export default ErrorBanner;
