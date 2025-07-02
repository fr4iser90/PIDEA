# Modern React Advanced Patterns

## Overview
Modern React development leverages advanced patterns, hooks, and best practices to build scalable, performant applications. This guide covers advanced React patterns, state management, performance optimization, and modern development techniques.

## Advanced Hooks Patterns

### Custom Hooks with TypeScript
```typescript
// Custom hook for API calls with caching
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseApiOptions<T> {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  cacheTime?: number;
  retryCount?: number;
  retryDelay?: number;
}

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useApi<T>(options: UseApiOptions<T>): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    const cacheKey = `${options.method || 'GET'}:${options.url}:${JSON.stringify(options.body)}`;
    const cached = cacheRef.current.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < (options.cacheTime || 300000)) {
      setData(cached.data);
      return;
    }

    setLoading(true);
    setError(null);

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    let retries = 0;
    const maxRetries = options.retryCount || 3;

    while (retries < maxRetries) {
      try {
        const response = await fetch(options.url, {
          method: options.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        setData(result);
        
        // Cache the result
        cacheRef.current.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });

        break;
      } catch (err) {
        retries++;
        if (retries >= maxRetries) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        } else {
          await new Promise(resolve => 
            setTimeout(resolve, (options.retryDelay || 1000) * retries)
          );
        }
      }
    }

    setLoading(false);
  }, [options.url, options.method, options.body, options.headers, options.cacheTime, options.retryCount, options.retryDelay]);

  useEffect(() => {
    fetchData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Custom hook for form validation
interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

interface UseFormOptions<T> {
  initialValues: T;
  validationRules?: Partial<Record<keyof T, ValidationRule>>;
  onSubmit: (values: T) => Promise<void> | void;
}

export function useForm<T extends Record<string, any>>(options: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(options.initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = useCallback((name: keyof T, value: any): string | null => {
    const rules = options.validationRules?.[name];
    if (!rules) return null;

    if (rules.required && !value) {
      return 'This field is required';
    }

    if (rules.minLength && value.length < rules.minLength) {
      return `Minimum length is ${rules.minLength} characters`;
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      return `Maximum length is ${rules.maxLength} characters`;
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      return 'Invalid format';
    }

    if (rules.custom) {
      return rules.custom(value);
    }

    return null;
  }, [options.validationRules]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    Object.keys(values).forEach((key) => {
      const fieldName = key as keyof T;
      const error = validateField(fieldName, values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validateField]);

  const handleChange = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error || undefined }));
    }
  }, [touched, validateField]);

  const handleBlur = useCallback((name: keyof T) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, values[name]);
    setErrors(prev => ({ ...prev, [name]: error || undefined }));
  }, [values, validateField]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await options.onSubmit(values);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, options, values]);

  const reset = useCallback(() => {
    setValues(options.initialValues);
    setErrors({});
    setTouched({});
  }, [options.initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
  };
}
```

### Context with Performance Optimization
```typescript
// Optimized context with useMemo and useCallback
import React, { createContext, useContext, useMemo, useCallback, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

interface UserContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const UserContext = createContext<UserContextValue | null>(null);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    // Additional logout logic (clear tokens, etc.)
  }, []);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Profile update failed');
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  }, [user]);

  const contextValue = useMemo(() => ({
    user,
    login,
    logout,
    updateProfile,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
  }), [user, login, logout, updateProfile]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
```

## Performance Optimization

### React.memo and useMemo
```typescript
// Optimized component with React.memo
interface UserCardProps {
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string;
  };
  onEdit: (userId: string) => void;
  onDelete: (userId: string) => void;
  isSelected: boolean;
}

export const UserCard = React.memo<UserCardProps>(({ 
  user, 
  onEdit, 
  onDelete, 
  isSelected 
}) => {
  const handleEdit = useCallback(() => {
    onEdit(user.id);
  }, [onEdit, user.id]);

  const handleDelete = useCallback(() => {
    onDelete(user.id);
  }, [onDelete, user.id]);

  const cardClassName = useMemo(() => {
    return `user-card ${isSelected ? 'selected' : ''}`;
  }, [isSelected]);

  return (
    <div className={cardClassName}>
      <img src={user.avatar} alt={user.name} className="avatar" />
      <div className="user-info">
        <h3>{user.name}</h3>
        <p>{user.email}</p>
      </div>
      <div className="actions">
        <button onClick={handleEdit}>Edit</button>
        <button onClick={handleDelete}>Delete</button>
      </div>
    </div>
  );
});

UserCard.displayName = 'UserCard';

// Virtual scrolling for large lists
interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
}

export function VirtualList<T>({ 
  items, 
  itemHeight, 
  containerHeight, 
  renderItem 
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;
  const visibleItemCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleItemCount + 1, items.length);

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex]);

  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Lazy Loading and Code Splitting
```typescript
// Lazy loading components
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const Settings = lazy(() => import('./pages/Settings'));

// Loading component
const LoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
    <p>Loading...</p>
  </div>
);

// Route-based code splitting
interface AppRoutesProps {
  currentRoute: string;
}

export function AppRoutes({ currentRoute }: AppRoutesProps) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      {currentRoute === 'dashboard' && <Dashboard />}
      {currentRoute === 'users' && <UserManagement />}
      {currentRoute === 'settings' && <Settings />}
    </Suspense>
  );
}

// Dynamic imports with error boundaries
class ErrorBoundary extends React.Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

// Lazy component with error boundary
export function LazyComponent({ 
  component: Component, 
  fallback = <LoadingSpinner />,
  errorFallback = <div>Something went wrong</div>
}: {
  component: React.LazyExoticComponent<any>;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
}) {
  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback}>
        <Component />
      </Suspense>
    </ErrorBoundary>
  );
}
```

## State Management Patterns

### Reducer Pattern with TypeScript
```typescript
// Complex state management with useReducer
interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
  sortBy: 'createdAt' | 'priority' | 'text';
  sortOrder: 'asc' | 'desc';
  loading: boolean;
  error: string | null;
}

type TodoAction =
  | { type: 'ADD_TODO'; payload: Omit<Todo, 'id' | 'createdAt'> }
  | { type: 'TOGGLE_TODO'; payload: string }
  | { type: 'DELETE_TODO'; payload: string }
  | { type: 'UPDATE_TODO'; payload: { id: string; updates: Partial<Todo> } }
  | { type: 'SET_FILTER'; payload: TodoState['filter'] }
  | { type: 'SET_SORT'; payload: { sortBy: TodoState['sortBy']; sortOrder: TodoState['sortOrder'] } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOAD_TODOS'; payload: Todo[] };

const todoReducer = (state: TodoState, action: TodoAction): TodoState => {
  switch (action.type) {
    case 'ADD_TODO':
      return {
        ...state,
        todos: [
          ...state.todos,
          {
            ...action.payload,
            id: crypto.randomUUID(),
            createdAt: new Date(),
          },
        ],
      };

    case 'TOGGLE_TODO':
      return {
        ...state,
        todos: state.todos.map(todo =>
          todo.id === action.payload
            ? { ...todo, completed: !todo.completed }
            : todo
        ),
      };

    case 'DELETE_TODO':
      return {
        ...state,
        todos: state.todos.filter(todo => todo.id !== action.payload),
      };

    case 'UPDATE_TODO':
      return {
        ...state,
        todos: state.todos.map(todo =>
          todo.id === action.payload.id
            ? { ...todo, ...action.payload.updates }
            : todo
        ),
      };

    case 'SET_FILTER':
      return { ...state, filter: action.payload };

    case 'SET_SORT':
      return {
        ...state,
        sortBy: action.payload.sortBy,
        sortOrder: action.payload.sortOrder,
      };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'LOAD_TODOS':
      return { ...state, todos: action.payload };

    default:
      return state;
  }
};

// Custom hook for todo management
export function useTodos() {
  const [state, dispatch] = useReducer(todoReducer, {
    todos: [],
    filter: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    loading: false,
    error: null,
  });

  const filteredAndSortedTodos = useMemo(() => {
    let filtered = state.todos;

    // Apply filter
    switch (state.filter) {
      case 'active':
        filtered = filtered.filter(todo => !todo.completed);
        break;
      case 'completed':
        filtered = filtered.filter(todo => todo.completed);
        break;
    }

    // Apply sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (state.sortBy) {
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'text':
          comparison = a.text.localeCompare(b.text);
          break;
      }

      return state.sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [state.todos, state.filter, state.sortBy, state.sortOrder]);

  const addTodo = useCallback((text: string, priority: Todo['priority']) => {
    dispatch({
      type: 'ADD_TODO',
      payload: { text, completed: false, priority },
    });
  }, []);

  const toggleTodo = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_TODO', payload: id });
  }, []);

  const deleteTodo = useCallback((id: string) => {
    dispatch({ type: 'DELETE_TODO', payload: id });
  }, []);

  const updateTodo = useCallback((id: string, updates: Partial<Todo>) => {
    dispatch({ type: 'UPDATE_TODO', payload: { id, updates } });
  }, []);

  const setFilter = useCallback((filter: TodoState['filter']) => {
    dispatch({ type: 'SET_FILTER', payload: filter });
  }, []);

  const setSort = useCallback((
    sortBy: TodoState['sortBy'],
    sortOrder: TodoState['sortOrder']
  ) => {
    dispatch({ type: 'SET_SORT', payload: { sortBy, sortOrder } });
  }, []);

  return {
    todos: filteredAndSortedTodos,
    filter: state.filter,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
    loading: state.loading,
    error: state.error,
    addTodo,
    toggleTodo,
    deleteTodo,
    updateTodo,
    setFilter,
    setSort,
  };
}
```

## Best Practices

### Component Design
- Use TypeScript for type safety
- Implement proper prop validation
- Use React.memo for performance optimization
- Keep components small and focused

### State Management
- Use useReducer for complex state
- Implement proper error boundaries
- Use context sparingly
- Consider external state management for large apps

### Performance
- Implement virtual scrolling for large lists
- Use lazy loading for code splitting
- Optimize re-renders with useMemo and useCallback
- Monitor bundle size and performance

### Testing
- Write unit tests for custom hooks
- Test component behavior and interactions
- Use React Testing Library
- Implement integration tests for complex flows 