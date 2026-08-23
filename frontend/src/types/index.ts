// User entity
export interface User {
  id: number;
  full_name: string;
  email: string;
  accent_color: AccentColor;
  created_at: string;
}

// Task priority and status enums as union types
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'PENDING' | 'INPROGRESS' | 'COMPLETED';

// Task entity
export interface Task {
  id: number;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  user_id: number;
}

// Theme types
export type Theme = 'light' | 'dark';
export type AccentColor = 'royal-blue' | 'ocean-blue' | 'sapphire' | 'sky-blue' | 'emerald-green' | 'violet';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
}

// Profile update types
export interface ProfileUpdatePayload {
  full_name: string;
  email: string;
}

export interface ProfileUpdateResponse {
  id: number;
  full_name: string;
  email: string;
  created_at: string;
}

// Auth context shape
export interface AuthContextType {
  token: string | null;
  user: User | null;
  login: (token: string, refreshToken: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

// API request payload shapes
export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface TaskPayload {
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
}

// API response shapes
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface ApiError {
  error: string;
}

export interface FieldErrors {
  [field: string]: string;
}

// Network error class for when fetch throws TypeError (no HTTP response)
export class NetworkError extends Error {
  constructor(message: string = 'Unable to connect. Please check your network and try again.') {
    super(message);
    this.name = 'NetworkError';
  }
}

// Team notification types
export type InvitationStatus = 'pending' | 'accepted' | 'declined';

export interface TeamMember {
  id: number;
  full_name: string;
  email: string;
  role: 'owner' | 'member';
  joined_at: string;
}

export interface PendingInvitation {
  id: number;
  email: string;
  status: InvitationStatus;
  created_at: string;
}

export interface TeamMembersResponse {
  members: TeamMember[];
  pending_invitations: PendingInvitation[];
}

export interface Notification {
  id: number;
  type: string;
  message: string;
  inviter_name: string;
  invitation_id: number;
  invitation_status: InvitationStatus;
  is_read: boolean;
  created_at: string;
}

export interface UnreadCountResponse {
  count: number;
}

// Kanban Board Ticket types
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TicketStatus = 'PENDING' | 'INPROGRESS' | 'COMPLETED';
export type ColumnId = TicketStatus;

export interface Ticket {
  id: number;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  team_id: number;
  creator_id: number;
  assignee_id: number | null;
  assignee_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketPayload {
  title: string;
  description: string;
  priority: TicketPriority;
  status?: TicketStatus;
  assignee_id?: number | null;
}

export interface KanbanColumnDef {
  id: ColumnId;
  title: string;  // "To Do", "In Progress", "Done"
  tickets: Ticket[];
}

export interface TeamMemberInfo {
  id: number;
  full_name: string;
  email: string;
}
