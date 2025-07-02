# React Tech Stack

## Overview
React is a JavaScript library for building user interfaces. This guide covers the complete React ecosystem including state management, routing, testing, and deployment.

## Core React Concepts

### Component Architecture
```typescript
// Functional Component with Hooks
import React, { useState, useEffect, useCallback, useMemo } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

interface UserListProps {
  users: User[];
  onUserSelect: (user: User) => void;
  isLoading?: boolean;
}

const UserList: React.FC<UserListProps> = ({ 
  users, 
  onUserSelect, 
  isLoading = false 
}) => {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Memoized filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  // Memoized callback
  const handleUserClick = useCallback((user: User) => {
    setSelectedUserId(user.id);
    onUserSelect(user);
  }, [onUserSelect]);

  // Effect for logging
  useEffect(() => {
    console.log('UserList rendered with', users.length, 'users');
  }, [users.length]);

  if (isLoading) {
    return <div>Loading users...</div>;
  }

  return (
    <div className="user-list">
      <input
        type="text"
        placeholder="Search users..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-input"
      />
      <ul>
        {filteredUsers.map(user => (
          <li
            key={user.id}
            onClick={() => handleUserClick(user)}
            className={selectedUserId === user.id ? 'selected' : ''}
          >
            <h3>{user.name}</h3>
            <p>{user.email}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserList;
```

### Custom Hooks
```typescript
// Custom hook for API calls
import { useState, useEffect, useCallback } from 'react';

interface UseApiOptions<T> {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  dependencies?: any[];
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function useApi<T>({ 
  url, 
  method = 'GET', 
  body, 
  headers = {}, 
  dependencies = [] 
}: UseApiOptions<T>): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [url, method, body, headers]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  return { data, loading, error, refetch: fetchData };
}

// Custom hook for local storage
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
}

// Custom hook for form handling
function useForm<T extends Record<string, any>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const handleChange = (name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleBlur = (name: keyof T) => {
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  const setFieldError = (name: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  const isValid = Object.keys(errors).length === 0;

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    setFieldError,
    reset,
    isValid,
  };
}
```

## State Management

### Context API
```typescript
// Theme Context
import React, { createContext, useContext, useReducer, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
}

interface ThemeAction {
  type: 'TOGGLE_THEME';
}

const ThemeContext = createContext<ThemeState | undefined>(undefined);

function themeReducer(state: Theme, action: ThemeAction): Theme {
  switch (action.type) {
    case 'TOGGLE_THEME':
      return state === 'light' ? 'dark' : 'light';
    default:
      return state;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, dispatch] = useReducer(themeReducer, 'light');

  const toggleTheme = () => {
    dispatch({ type: 'TOGGLE_THEME' });
  };

  const value = {
    theme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      <div className={`theme-${theme}`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// User Context
interface User {
  id: string;
  name: string;
  email: string;
}

interface UserState {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

const UserContext = createContext<UserState | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
```

### Redux Toolkit
```typescript
// Store setup
import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';

// User slice
interface User {
  id: string;
  name: string;
  email: string;
}

interface UserState {
  currentUser: User | null;
  users: User[];
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  currentUser: null,
  users: [],
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setCurrentUser: (state, action: PayloadAction<User | null>) => {
      state.currentUser = action.payload;
    },
    setUsers: (state, action: PayloadAction<User[]>) => {
      state.users = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    addUser: (state, action: PayloadAction<User>) => {
      state.users.push(action.payload);
    },
    updateUser: (state, action: PayloadAction<User>) => {
      const index = state.users.findIndex(user => user.id === action.payload.id);
      if (index !== -1) {
        state.users[index] = action.payload;
      }
    },
    deleteUser: (state, action: PayloadAction<string>) => {
      state.users = state.users.filter(user => user.id !== action.payload);
    },
  },
});

export const {
  setCurrentUser,
  setUsers,
  setLoading,
  setError,
  addUser,
  updateUser,
  deleteUser,
} = userSlice.actions;

// Async thunk
export const fetchUsers = createAsyncThunk(
  'user/fetchUsers',
  async (_, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      const response = await fetch('/api/users');
      const users = await response.json();
      dispatch(setUsers(users));
      return users;
    } catch (error) {
      dispatch(setError(error instanceof Error ? error.message : 'Failed to fetch users'));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }
);

// Store configuration
export const store = configureStore({
  reducer: {
    user: userSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <T>(selector: (state: RootState) => T) => 
  useSelector<RootState, T>(selector);
```

## Routing

### React Router
```typescript
import { 
  BrowserRouter, 
  Routes, 
  Route, 
  Link, 
  useParams, 
  useNavigate,
  Navigate 
} from 'react-router-dom';

// Protected route component
interface ProtectedRouteProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
  redirectTo?: string;
}

function ProtectedRoute({ 
  children, 
  isAuthenticated, 
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }
  return <>{children}</>;
}

// Navigation component
function Navigation() {
  const { user } = useUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    // Logout logic
    navigate('/login');
  };

  return (
    <nav className="navigation">
      <Link to="/">Home</Link>
      <Link to="/users">Users</Link>
      {user ? (
        <>
          <Link to="/profile">Profile</Link>
          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <Link to="/login">Login</Link>
      )}
    </nav>
  );
}

// User detail component with params
function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: user, loading, error } = useApi<User>({
    url: `/api/users/${id}`,
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div className="user-detail">
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}

// App routing
function App() {
  const { user } = useUser();

  return (
    <BrowserRouter>
      <ThemeProvider>
        <UserProvider>
          <div className="app">
            <Navigation />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route 
                path="/users" 
                element={
                  <ProtectedRoute isAuthenticated={!!user}>
                    <UserList />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/users/:id" 
                element={
                  <ProtectedRoute isAuthenticated={!!user}>
                    <UserDetail />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute isAuthenticated={!!user}>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </UserProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
```

## Styling Solutions

### CSS Modules
```typescript
// UserCard.module.css
.userCard {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  margin: 8px;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s ease;
}

.userCard:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.userCard.selected {
  border-color: #007bff;
  background-color: #f8f9fa;
}

.userName {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #333;
}

.userEmail {
  font-size: 14px;
  color: #666;
  margin: 0;
}

// UserCard.tsx
import styles from './UserCard.module.css';

interface UserCardProps {
  user: User;
  selected?: boolean;
  onClick?: (user: User) => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, selected, onClick }) => {
  return (
    <div 
      className={`${styles.userCard} ${selected ? styles.selected : ''}`}
      onClick={() => onClick?.(user)}
    >
      <h3 className={styles.userName}>{user.name}</h3>
      <p className={styles.userEmail}>{user.email}</p>
    </div>
  );
};
```

### Styled Components
```typescript
import styled, { css, keyframes } from 'styled-components';

// Animations
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Base styles
const baseButtonStyles = css`
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

// Styled components
const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  ${baseButtonStyles}
  
  ${({ variant = 'primary' }) => {
    switch (variant) {
      case 'secondary':
        return css`
          background-color: #6c757d;
          color: white;
          
          &:hover:not(:disabled) {
            background-color: #5a6268;
          }
        `;
      case 'danger':
        return css`
          background-color: #dc3545;
          color: white;
          
          &:hover:not(:disabled) {
            background-color: #c82333;
          }
        `;
      default:
        return css`
          background-color: #007bff;
          color: white;
          
          &:hover:not(:disabled) {
            background-color: #0056b3;
          }
        `;
    }
  }}
`;

const Card = styled.div<{ selected?: boolean }>`
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  margin: 8px;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  animation: ${fadeIn} 0.3s ease;
  
  ${({ selected }) => selected && css`
    border-color: #007bff;
    background-color: #f8f9fa;
    box-shadow: 0 4px 8px rgba(0, 123, 255, 0.2);
  `}
  
  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin: 24px 0;
`;

// Usage
function UserGrid({ users, selectedUser, onUserSelect }: {
  users: User[];
  selectedUser: User | null;
  onUserSelect: (user: User) => void;
}) {
  return (
    <Container>
      <Grid>
        {users.map(user => (
          <Card
            key={user.id}
            selected={selectedUser?.id === user.id}
            onClick={() => onUserSelect(user)}
          >
            <h3>{user.name}</h3>
            <p>{user.email}</p>
            <Button variant="secondary" onClick={(e) => {
              e.stopPropagation();
              // Edit user
            }}>
              Edit
            </Button>
          </Card>
        ))}
      </Grid>
    </Container>
  );
}
```

## Testing

### Jest and React Testing Library
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from './store';
import UserList from './UserList';

// Test utilities
const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

// Mock API
jest.mock('./api', () => ({
  fetchUsers: jest.fn(),
}));

// UserList component tests
describe('UserList', () => {
  const mockUsers = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders user list', () => {
    renderWithProviders(
      <UserList 
        users={mockUsers} 
        onUserSelect={jest.fn()} 
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  test('shows loading state', () => {
    renderWithProviders(
      <UserList 
        users={[]} 
        onUserSelect={jest.fn()} 
        isLoading={true} 
      />
    );

    expect(screen.getByText('Loading users...')).toBeInTheDocument();
  });

  test('filters users by search term', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(
      <UserList 
        users={mockUsers} 
        onUserSelect={jest.fn()} 
      />
    );

    const searchInput = screen.getByPlaceholderText('Search users...');
    await user.type(searchInput, 'John');

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });

  test('calls onUserSelect when user is clicked', () => {
    const mockOnUserSelect = jest.fn();
    
    renderWithProviders(
      <UserList 
        users={mockUsers} 
        onUserSelect={mockOnUserSelect} 
      />
    );

    fireEvent.click(screen.getByText('John Doe'));

    expect(mockOnUserSelect).toHaveBeenCalledWith(mockUsers[0]);
  });

  test('highlights selected user', () => {
    renderWithProviders(
      <UserList 
        users={mockUsers} 
        onUserSelect={jest.fn()} 
      />
    );

    const userElement = screen.getByText('John Doe').closest('li');
    fireEvent.click(userElement!);

    expect(userElement).toHaveClass('selected');
  });
});

// Custom hook tests
describe('useApi', () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  test('fetches data successfully', async () => {
    const mockData = { id: 1, name: 'Test' };
    fetch.mockResponseOnce(JSON.stringify(mockData));

    const TestComponent = () => {
      const { data, loading, error } = useApi<typeof mockData>({
        url: '/api/test',
      });

      if (loading) return <div>Loading...</div>;
      if (error) return <div>Error: {error}</div>;
      return <div>Data: {data?.name}</div>;
    };

    render(<TestComponent />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Data: Test')).toBeInTheDocument();
    });
  });

  test('handles API errors', async () => {
    fetch.mockRejectOnce(new Error('API Error'));

    const TestComponent = () => {
      const { data, loading, error } = useApi<{}>({
        url: '/api/test',
      });

      if (loading) return <div>Loading...</div>;
      if (error) return <div>Error: {error}</div>;
      return <div>Success</div>;
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByText('Error: API Error')).toBeInTheDocument();
    });
  });
});
```

## Performance Optimization

### React.memo and useMemo
```typescript
// Memoized component
const ExpensiveComponent = React.memo<{ data: any[]; onItemClick: (item: any) => void }>(
  ({ data, onItemClick }) => {
    const processedData = useMemo(() => {
      return data.map(item => ({
        ...item,
        processed: item.value * 2,
      }));
    }, [data]);

    return (
      <div>
        {processedData.map(item => (
          <div key={item.id} onClick={() => onItemClick(item)}>
            {item.name}: {item.processed}
          </div>
        ))}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function
    return (
      prevProps.data.length === nextProps.data.length &&
      prevProps.onItemClick === nextProps.onItemClick
    );
  }
);

// Virtual scrolling for large lists
import { FixedSizeList as List } from 'react-window';

const VirtualizedList = ({ items }: { items: any[] }) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <div className="list-item">
        {items[index].name}
      </div>
    </div>
  );

  return (
    <List
      height={400}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </List>
  );
};
```

## Error Boundaries
```typescript
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Log to error reporting service
    // logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary">
          <h2>Something went wrong.</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
function App() {
  return (
    <ErrorBoundary>
      <UserList users={users} onUserSelect={handleUserSelect} />
    </ErrorBoundary>
  );
}
```

## Build and Deployment

### Webpack Configuration
```javascript
// webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './src/index.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      clean: true,
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
          ],
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif)$/i,
          type: 'asset/resource',
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.html',
      }),
      ...(isProduction ? [new MiniCssExtractPlugin()] : []),
    ],
    optimization: {
      minimizer: [new TerserPlugin()],
      splitChunks: {
        chunks: 'all',
      },
    },
    devServer: {
      static: './dist',
      hot: true,
      historyApiFallback: true,
    },
  };
};
```

### Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
