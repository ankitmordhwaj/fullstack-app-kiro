import { useNavigate } from 'react-router-dom';
import styles from './NotificationIcon.module.css';

interface NotificationIconProps {
  readonly unreadCount: number;
}

function NotificationIcon({ unreadCount }: NotificationIconProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/notifications');
  };

  return (
    <button
      className={styles.iconButton}
      onClick={handleClick}
      aria-label="View notifications"
      type="button"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {unreadCount > 0 && (
        <span className={styles.badge}>{unreadCount}</span>
      )}
    </button>
  );
}

export default NotificationIcon;
