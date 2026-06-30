---
inclusion: fileMatch
fileMatchPattern: ["frontend/**/*.tsx", "frontend/**/*.ts", "frontend/**/*.css"]
---

# React + TypeScript Best Practices

## Component Structure


| Layer | Standard |
|------|---------|
| Framework | React (latest LTS) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS |
| State Management | React Query / Context |
| HTTP | Native `fetch` or equivalent |
| Build Tool | Vite or equivalent |
| Testing | Jest   |


### File Naming
- Component files use PascalCase with `.tsx` extension: `TaskList.tsx`, `LoginForm.tsx`
- Non-component TypeScript files use `.ts`: `api/tasks.ts`, `types/index.ts`
- One component per file
- Use tailwind css for styling.
- Use a clean and modern UI style.
- Keep all parts of the frontend follow same design guidelines.
- Make sure the UI is 
- **No `.js` or `.jsx` files anywhere in the frontend**

### Component Template
```tsx
// Always use functional components with hooks — never class components
import React, { useState, useEffect } from 'react';
import type { Task } from '../types';

interface ComponentNameProps {
  tasks: Task[];
  onDelete: (id: number) => void;
}

function ComponentName({ tasks, onDelete }: ComponentNameProps) {
  // 1. State declarations
  const [loading, setLoading] = useState<boolean>(false);

  // 2. Side effects
  useEffect(() => {
    // fetch or setup
  }, []);

  // 3. Event handlers
  const handleSubmit = (): void => {};

  // 4. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}

export default ComponentName;
```

## API Communication

### Always use fetch — never Axios or any other library

All API calls live in `frontend/src/api/` and follow this pattern:

```ts
// frontend/src/api/tasks.ts
import type { Task } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

export async function getTasks(token: string): Promise<Task[]> {
  const response = await fetch(`${API_URL}/tasks`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }
  return response.json();
}

export async function createTask(
  token: string,
  data: Omit<Task, 'id' | 'created_at' | 'user_id'>
): Promise<Task> {
  const response = await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }
  return response.json();
}

export async function updateTask(
  token: string,
  taskId: number,
  data: Partial<Omit<Task, 'id' | 'created_at' | 'user_id'>>
): Promise<Task> {
  const response = await fetch(`${API_URL}/tasks/${taskId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }
  return response.json();
}

export async function deleteTask(token: string, taskId: number): Promise<void> {
  const response = await fetch(`${API_URL}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }
}
```

### Error Handling
- Always check `response.ok` before calling `.json()`
- Throw an error with the API's message so components can display it
- Never swallow errors silently
- Use `import.meta.env.VITE_API_URL` — NOT `process.env.REACT_APP_API_URL`

## Authentication

### Auth Context Pattern
```tsx
// frontend/src/context/AuthContext.tsx
import React, { createContext, useContext, useState } from 'react';
import type { User, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(
    JSON.parse(localStorage.getItem('user') || 'null')
  );

  const login = (token: string, user: User): void => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const logout = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
```

### Protected Route Pattern
```tsx
// frontend/src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default ProtectedRoute;
```

## State Management
- Use `useState` for local component state
- Use React Context for global state (auth token, current user)
- Do NOT introduce Redux or Zustand for this project
- Lift state up to the nearest common ancestor when two components share data

## Forms
- Always use controlled inputs (value + onChange)
- Show validation errors inline below each field
- Disable the submit button while a request is in-flight
- Clear form errors when the user starts typing again

```tsx
// Controlled input pattern in TypeScript
const [email, setEmail] = useState<string>('');
const [error, setError] = useState<string>('');

<input
  type="email"
  value={email}
  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError('');
  }}
/>
{error && <span className="error">{error}</span>}
```

## Loading & Error States
Every component that fetches data must handle three states:

```tsx
const [loading, setLoading] = useState<boolean>(true);
const [error, setError] = useState<string | null>(null);
const [data, setData] = useState<Task[]>([]);

useEffect(() => {
  fetchData()
    .then(setData)
    .catch((err: Error) => setError(err.message))
    .finally(() => setLoading(false));
}, []);

if (loading) return <p>Loading...</p>;
if (error) return <p className="error">{error}</p>;
```

## Routing Structure
```tsx
// App.tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
  <Route
    path="/tasks"
    element={
      <ProtectedRoute>
        <TasksPage />
      </ProtectedRoute>
    }
  />
  <Route path="/" element={<Navigate to="/tasks" replace />} />
</Routes>
```

## Folder Structure
```
frontend/src/
├── api/
│   ├── auth.ts            # register(), login()
│   └── tasks.ts           # getTasks(), createTask(), updateTask(), deleteTask()
├── components/
│   ├── ProtectedRoute.tsx
│   ├── ProtectedRoute.test.tsx
│   ├── TaskCard.tsx
│   ├── TaskCard.test.tsx
│   ├── TaskForm.tsx
│   ├── TaskForm.test.tsx
│   ├── TaskEditModal.tsx
│   ├── TaskEditModal.test.tsx
│   └── Navbar.tsx
│   └── Navbar.test.tsx
├── context/
│   └── AuthContext.tsx
├── pages/
│   ├── LoginPage.tsx
│   ├── LoginPage.test.tsx
│   ├── RegisterPage.tsx
│   ├── RegisterPage.test.tsx
│   ├── TasksPage.tsx
│   └── TasksPage.test.tsx
├── types/
│   └── index.ts           # User, Task, Priority, Status, AuthContextType interfaces
├── App.tsx
└── main.tsx
```

## Unit Testing

### Setup
Install: `npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom`

Add to `vite.config.ts`:
```ts
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: './src/setupTests.ts',
}
```

Create `src/setupTests.ts`:
```ts
import '@testing-library/jest-dom';
```

### Test Pattern — Component
```tsx
// frontend/src/components/TaskCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TaskCard from './TaskCard';
import type { Task } from '../types';

const mockTask: Task = {
  id: 1,
  title: 'Test task',
  description: 'A description',
  priority: 'HIGH',
  status: 'PENDING',
  created_at: '2024-01-01T00:00:00',
  user_id: 1,
};

describe('TaskCard', () => {
  it('renders title and description', () => {
    render(<TaskCard task={mockTask} onDelete={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getByText('Test task')).toBeInTheDocument();
    expect(screen.getByText('A description')).toBeInTheDocument();
  });

  it('calls onDelete with task id when delete is clicked', () => {
    const onDelete = vi.fn();
    render(<TaskCard task={mockTask} onDelete={onDelete} onEdit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('calls onEdit with task when edit is clicked', () => {
    const onEdit = vi.fn();
    render(<TaskCard task={mockTask} onDelete={vi.fn()} onEdit={onEdit} />);
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(mockTask);
  });
});
```

### Test Pattern — API function
```ts
// frontend/src/api/tasks.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTasks, deleteTask } from './tasks';

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('getTasks', () => {
  it('returns tasks on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1, title: 'Task' }],
    }));
    const result = await getTasks('mock-token');
    expect(result).toHaveLength(1);
  });

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Unauthorized' }),
    }));
    await expect(getTasks('bad-token')).rejects.toThrow('Unauthorized');
  });
});
```

### Rules
- One test file per component/page/API module — colocated alongside source file
- Every component must test: renders correctly, user interactions (click, type), error states
- Every API function must test: success path, non-ok response throwing an error
- Mock `fetch` with `vi.stubGlobal` — never make real HTTP calls in tests
- Do NOT write property-based tests — unit tests only
- Run with: `npm run test`

## Do Nots
- Do NOT enable `verbatimModuleSyntax` in `tsconfig.app.json` — it forces `import type` everywhere and causes Vite dev server `SyntaxError: does not provide an export named` at runtime
- Do NOT use `.js` or `.jsx` files — TypeScript only (`.ts` and `.tsx`)
- Do NOT use `any` type — use proper types or `unknown` with type guards
- Do NOT use class components — functional components only
- Do NOT use Axios — use fetch only
- Do NOT use Redux or any external state library
- Do NOT use `process.env` — use `import.meta.env` for Vite environment variables
- Do NOT store sensitive data beyond the JWT token in localStorage
- Do NOT make API calls directly inside JSX — always extract to `api/` files
- Do NOT write property-based tests — unit tests only