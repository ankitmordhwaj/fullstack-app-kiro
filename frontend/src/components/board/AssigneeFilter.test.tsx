import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AssigneeFilter from './AssigneeFilter';
import type { TeamMemberInfo } from '../../types';

const mockMembers: TeamMemberInfo[] = [
  { id: 1, full_name: 'Alice Johnson', email: 'alice@example.com' },
  { id: 2, full_name: 'Bob Smith', email: 'bob@example.com' },
  { id: 3, full_name: 'Charlie Brown', email: 'charlie@example.com' },
];

describe('AssigneeFilter', () => {
  it('renders "All Members" tab and all member names', () => {
    render(
      <AssigneeFilter members={mockMembers} selectedAssigneeIds={[]} onChange={vi.fn()} />
    );
    expect(screen.getByText('All Members')).toBeInTheDocument();
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
  });

  it('marks "All Members" as active when selectedAssigneeIds is empty', () => {
    render(
      <AssigneeFilter members={mockMembers} selectedAssigneeIds={[]} onChange={vi.fn()} />
    );
    const allBtn = screen.getByText('All Members');
    expect(allBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks selected members as active', () => {
    render(
      <AssigneeFilter members={mockMembers} selectedAssigneeIds={[2]} onChange={vi.fn()} />
    );
    const bobBtn = screen.getByText('Bob Smith');
    expect(bobBtn).toHaveAttribute('aria-pressed', 'true');

    const allBtn = screen.getByText('All Members');
    expect(allBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with member ID when a member is clicked', () => {
    const onChange = vi.fn();
    render(
      <AssigneeFilter members={mockMembers} selectedAssigneeIds={[]} onChange={onChange} />
    );
    fireEvent.click(screen.getByText('Alice Johnson'));
    expect(onChange).toHaveBeenCalledWith([1]);
  });

  it('calls onChange removing member ID when an already-selected member is clicked', () => {
    const onChange = vi.fn();
    render(
      <AssigneeFilter members={mockMembers} selectedAssigneeIds={[1, 2]} onChange={onChange} />
    );
    fireEvent.click(screen.getByText('Alice Johnson'));
    expect(onChange).toHaveBeenCalledWith([2]);
  });

  it('calls onChange with empty array when "All Members" is clicked', () => {
    const onChange = vi.fn();
    render(
      <AssigneeFilter members={mockMembers} selectedAssigneeIds={[1, 3]} onChange={onChange} />
    );
    fireEvent.click(screen.getByText('All Members'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('displays at most 20 members', () => {
    const manyMembers: TeamMemberInfo[] = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      full_name: `Member ${i + 1}`,
      email: `member${i + 1}@example.com`,
    }));
    render(
      <AssigneeFilter members={manyMembers} selectedAssigneeIds={[]} onChange={vi.fn()} />
    );
    // 20 members + "All Members" = 21 buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(21);
  });

  it('supports multiple selections', () => {
    const onChange = vi.fn();
    render(
      <AssigneeFilter members={mockMembers} selectedAssigneeIds={[1]} onChange={onChange} />
    );
    fireEvent.click(screen.getByText('Bob Smith'));
    expect(onChange).toHaveBeenCalledWith([1, 2]);
  });
});
