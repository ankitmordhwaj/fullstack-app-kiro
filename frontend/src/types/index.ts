// User entity
export interface User {
  id: number;
  full_name: string;
  email: string;
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

// Auth context shape
export interface AuthContextType {
  token: string | null;
  user: User | null;
  login: (token: string, refreshToken: string, user: User) => void;
  logout: () => void;
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
