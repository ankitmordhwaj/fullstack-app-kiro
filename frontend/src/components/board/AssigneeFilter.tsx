import type { TeamMemberInfo } from '../../types';
import styles from './AssigneeFilter.module.css';

interface AssigneeFilterProps {
  members: TeamMemberInfo[];
  selectedAssigneeIds: number[];
  onChange: (assigneeIds: number[]) => void;
}

function AssigneeFilter({ members, selectedAssigneeIds, onChange }: AssigneeFilterProps) {
  const isAllSelected = selectedAssigneeIds.length === 0;

  const handleAllClick = (): void => {
    onChange([]);
  };

  const handleMemberClick = (memberId: number): void => {
    if (selectedAssigneeIds.includes(memberId)) {
      // Deselect this member
      const updated = selectedAssigneeIds.filter((id) => id !== memberId);
      onChange(updated);
    } else {
      // Select this member
      onChange([...selectedAssigneeIds, memberId]);
    }
  };

  const displayedMembers = members.slice(0, 20);

  return (
    <div className={styles.filterContainer} role="group" aria-label="Filter by assignee">
      <button
        type="button"
        className={`${styles.tab} ${isAllSelected ? styles.active : ''}`}
        onClick={handleAllClick}
        aria-pressed={isAllSelected}
      >
        All Members
      </button>
      {displayedMembers.map((member) => {
        const isSelected = selectedAssigneeIds.includes(member.id);
        return (
          <button
            key={member.id}
            type="button"
            className={`${styles.tab} ${isSelected ? styles.active : ''}`}
            onClick={() => handleMemberClick(member.id)}
            aria-pressed={isSelected}
          >
            {member.full_name}
          </button>
        );
      })}
    </div>
  );
}

export default AssigneeFilter;
