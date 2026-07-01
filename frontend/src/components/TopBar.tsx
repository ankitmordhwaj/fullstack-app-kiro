import { useAuth } from '../context/AuthContext';
import { getInitials, truncateName } from '../utils/navigation';
import styles from './TopBar.module.css';

interface TopBarProps {
  readonly onHamburgerClick: () => void;
  readonly showHamburger: boolean;
}

function TopBar({ onHamburgerClick, showHamburger }: TopBarProps) {
  const { user } = useAuth();

  return (
    <header className={styles.topBar}>
      <div className={styles.leftSection}>
        {showHamburger ? (
          <button
            className={styles.hamburgerButton}
            onClick={onHamburgerClick}
            aria-label="Toggle navigation menu"
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
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        ) : (
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search..."
              aria-label="Search"
            />
          </div>
        )}
      </div>

      <div className={styles.userInfo}>
        {user ? (
          <>
            <div className={styles.avatar}>
              {getInitials(user.full_name)}
            </div>
            <div className={styles.userDetails}>
              <span className={styles.userName}>
                {truncateName(user.full_name)}
              </span>
              <span className={styles.userRole}>Member</span>
            </div>
          </>
        ) : (
          <>
            <div className={styles.skeletonAvatar} />
            <div className={styles.skeletonDetails}>
              <div className={styles.skeletonName} />
              <div className={styles.skeletonRole} />
            </div>
          </>
        )}
      </div>
    </header>
  );
}

export default TopBar;
