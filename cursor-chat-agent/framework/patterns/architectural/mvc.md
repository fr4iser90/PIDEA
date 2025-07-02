# Model-View-Controller (MVC) Patterns

## Overview
The Model-View-Controller pattern separates an application into three interconnected components to promote code organization, maintainability, and testability.

## Core Components

### Model
```typescript
// Data models representing business logic and data
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

class UserModel {
  private users: User[] = [];
  
  async findAll(): Promise<User[]> {
    // Fetch from database or API
    return this.users;
  }
  
  async findById(id: string): Promise<User | null> {
    return this.users.find(user => user.id === id) || null;
  }
  
  async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const user: User = {
      id: this.generateId(),
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.users.push(user);
    return user;
  }
  
  async update(id: string, updates: Partial<User>): Promise<User | null> {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) return null;
    
    this.users[userIndex] = {
      ...this.users[userIndex],
      ...updates,
      updatedAt: new Date()
    };
    
    return this.users[userIndex];
  }
  
  async delete(id: string): Promise<boolean> {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) return false;
    
    this.users.splice(userIndex, 1);
    return true;
  }
  
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
```

### View
```typescript
// Presentation layer responsible for rendering UI
interface View {
  render(data: any): string;
}

class UserListView implements View {
  render(users: User[]): string {
    return `
      <div class="user-list">
        <h2>Users</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(user => `
              <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.createdAt.toLocaleDateString()}</td>
                <td>
                  <button onclick="editUser('${user.id}')">Edit</button>
                  <button onclick="deleteUser('${user.id}')">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <button onclick="showCreateUserForm()">Add User</button>
      </div>
    `;
  }
}

class UserDetailView implements View {
  render(user: User): string {
    return `
      <div class="user-detail">
        <h2>User Details</h2>
        <form id="userForm">
          <input type="hidden" id="userId" value="${user.id}">
          <div>
            <label for="name">Name:</label>
            <input type="text" id="name" value="${user.name}" required>
          </div>
          <div>
            <label for="email">Email:</label>
            <input type="email" id="email" value="${user.email}" required>
          </div>
          <button type="submit">Save</button>
          <button type="button" onclick="cancelEdit()">Cancel</button>
        </form>
      </div>
    `;
  }
}

class UserFormView implements View {
  render(): string {
    return `
      <div class="user-form">
        <h2>Create New User</h2>
        <form id="createUserForm">
          <div>
            <label for="name">Name:</label>
            <input type="text" id="name" required>
          </div>
          <div>
            <label for="email">Email:</label>
            <input type="email" id="email" required>
          </div>
          <button type="submit">Create</button>
          <button type="button" onclick="cancelCreate()">Cancel</button>
        </form>
      </div>
    `;
  }
}
```

### Controller
```typescript
// Business logic layer that handles user interactions
class UserController {
  private model: UserModel;
  private views: {
    list: UserListView;
    detail: UserDetailView;
    form: UserFormView;
  };
  
  constructor(model: UserModel) {
    this.model = model;
    this.views = {
      list: new UserListView(),
      detail: new UserDetailView(),
      form: new UserFormView()
    };
  }
  
  async showUserList(): Promise<void> {
    try {
      const users = await this.model.findAll();
      const html = this.views.list.render(users);
      this.updateDOM(html);
    } catch (error) {
      this.showError('Failed to load users');
    }
  }
  
  async showUserDetail(id: string): Promise<void> {
    try {
      const user = await this.model.findById(id);
      if (!user) {
        this.showError('User not found');
        return;
      }
      
      const html = this.views.detail.render(user);
      this.updateDOM(html);
      this.attachFormHandlers();
    } catch (error) {
      this.showError('Failed to load user details');
    }
  }
  
  async showCreateForm(): Promise<void> {
    const html = this.views.form.render();
    this.updateDOM(html);
    this.attachCreateFormHandlers();
  }
  
  async createUser(userData: { name: string; email: string }): Promise<void> {
    try {
      await this.model.create(userData);
      this.showUserList();
      this.showSuccess('User created successfully');
    } catch (error) {
      this.showError('Failed to create user');
    }
  }
  
  async updateUser(id: string, userData: { name: string; email: string }): Promise<void> {
    try {
      const updated = await this.model.update(id, userData);
      if (!updated) {
        this.showError('User not found');
        return;
      }
      
      this.showUserList();
      this.showSuccess('User updated successfully');
    } catch (error) {
      this.showError('Failed to update user');
    }
  }
  
  async deleteUser(id: string): Promise<void> {
    try {
      const deleted = await this.model.delete(id);
      if (!deleted) {
        this.showError('User not found');
        return;
      }
      
      this.showUserList();
      this.showSuccess('User deleted successfully');
    } catch (error) {
      this.showError('Failed to delete user');
    }
  }
  
  private updateDOM(html: string): void {
    const container = document.getElementById('app');
    if (container) {
      container.innerHTML = html;
    }
  }
  
  private attachFormHandlers(): void {
    const form = document.getElementById('userForm') as HTMLFormElement;
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const id = formData.get('userId') as string;
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        
        await this.updateUser(id, { name, email });
      });
    }
  }
  
  private attachCreateFormHandlers(): void {
    const form = document.getElementById('createUserForm') as HTMLFormElement;
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        
        await this.createUser({ name, email });
      });
    }
  }
  
  private showError(message: string): void {
    // Display error message to user
    console.error(message);
  }
  
  private showSuccess(message: string): void {
    // Display success message to user
    console.log(message);
  }
}
```

## Advanced MVC Patterns

### Observer Pattern for Model Updates
```typescript
// Observer interface
interface Observer {
  update(data: any): void;
}

// Observable model
class ObservableUserModel extends UserModel {
  private observers: Observer[] = [];
  
  addObserver(observer: Observer): void {
    this.observers.push(observer);
  }
  
  removeObserver(observer: Observer): void {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }
  
  private notifyObservers(data: any): void {
    this.observers.forEach(observer => observer.update(data));
  }
  
  async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const user = await super.create(userData);
    this.notifyObservers({ type: 'USER_CREATED', user });
    return user;
  }
  
  async update(id: string, updates: Partial<User>): Promise<User | null> {
    const user = await super.update(id, updates);
    if (user) {
      this.notifyObservers({ type: 'USER_UPDATED', user });
    }
    return user;
  }
  
  async delete(id: string): Promise<boolean> {
    const deleted = await super.delete(id);
    if (deleted) {
      this.notifyObservers({ type: 'USER_DELETED', id });
    }
    return deleted;
  }
}

// Controller as observer
class UserController implements Observer {
  private model: ObservableUserModel;
  private currentView: string = 'list';
  
  constructor(model: ObservableUserModel) {
    this.model = model;
    this.model.addObserver(this);
  }
  
  update(data: any): void {
    // React to model changes
    switch (data.type) {
      case 'USER_CREATED':
      case 'USER_UPDATED':
      case 'USER_DELETED':
        if (this.currentView === 'list') {
          this.showUserList();
        }
        break;
    }
  }
}
```

### Command Pattern for Actions
```typescript
// Command interface
interface Command {
  execute(): Promise<void>;
  undo(): Promise<void>;
}

// Concrete commands
class CreateUserCommand implements Command {
  private userData: { name: string; email: string };
  private model: UserModel;
  private createdUser: User | null = null;
  
  constructor(userData: { name: string; email: string }, model: UserModel) {
    this.userData = userData;
    this.model = model;
  }
  
  async execute(): Promise<void> {
    this.createdUser = await this.model.create(this.userData);
  }
  
  async undo(): Promise<void> {
    if (this.createdUser) {
      await this.model.delete(this.createdUser.id);
    }
  }
}

class UpdateUserCommand implements Command {
  private id: string;
  private updates: Partial<User>;
  private model: UserModel;
  private previousUser: User | null = null;
  
  constructor(id: string, updates: Partial<User>, model: UserModel) {
    this.id = id;
    this.updates = updates;
    this.model = model;
  }
  
  async execute(): Promise<void> {
    this.previousUser = await this.model.findById(this.id);
    await this.model.update(this.id, this.updates);
  }
  
  async undo(): Promise<void> {
    if (this.previousUser) {
      await this.model.update(this.id, this.previousUser);
    }
  }
}

// Command invoker
class CommandInvoker {
  private commands: Command[] = [];
  private currentIndex: number = -1;
  
  execute(command: Command): Promise<void> {
    // Remove any commands after current index (for redo)
    this.commands = this.commands.slice(0, this.currentIndex + 1);
    
    // Execute new command
    this.commands.push(command);
    this.currentIndex++;
    
    return command.execute();
  }
  
  undo(): Promise<void> {
    if (this.currentIndex >= 0) {
      const command = this.commands[this.currentIndex];
      this.currentIndex--;
      return command.undo();
    }
    return Promise.resolve();
  }
  
  redo(): Promise<void> {
    if (this.currentIndex < this.commands.length - 1) {
      this.currentIndex++;
      const command = this.commands[this.currentIndex];
      return command.execute();
    }
    return Promise.resolve();
  }
  
  canUndo(): boolean {
    return this.currentIndex >= 0;
  }
  
  canRedo(): boolean {
    return this.currentIndex < this.commands.length - 1;
  }
}
```

### Factory Pattern for Views
```typescript
// View factory
class ViewFactory {
  static createView(type: string): View {
    switch (type) {
      case 'list':
        return new UserListView();
      case 'detail':
        return new UserDetailView();
      case 'form':
        return new UserFormView();
      default:
        throw new Error(`Unknown view type: ${type}`);
    }
  }
}

// Controller using factory
class UserController {
  private model: UserModel;
  private viewFactory: ViewFactory;
  
  constructor(model: UserModel) {
    this.model = model;
    this.viewFactory = ViewFactory;
  }
  
  async showView(viewType: string, data?: any): Promise<void> {
    const view = this.viewFactory.createView(viewType);
    const html = view.render(data);
    this.updateDOM(html);
  }
}
```

## MVC with Dependency Injection

### Dependency Injection Container
```typescript
// Service container
class Container {
  private services: Map<string, any> = new Map();
  private factories: Map<string, () => any> = new Map();
  
  register<T>(name: string, factory: () => T): void {
    this.factories.set(name, factory);
  }
  
  resolve<T>(name: string): T {
    if (this.services.has(name)) {
      return this.services.get(name);
    }
    
    if (this.factories.has(name)) {
      const factory = this.factories.get(name);
      const service = factory();
      this.services.set(name, service);
      return service;
    }
    
    throw new Error(`Service not found: ${name}`);
  }
}

// Application setup
class Application {
  private container: Container;
  
  constructor() {
    this.container = new Container();
    this.setupServices();
  }
  
  private setupServices(): void {
    // Register services
    this.container.register('userModel', () => new ObservableUserModel());
    this.container.register('userController', () => {
      const model = this.container.resolve<ObservableUserModel>('userModel');
      return new UserController(model);
    });
    this.container.register('commandInvoker', () => new CommandInvoker());
  }
  
  getController(): UserController {
    return this.container.resolve<UserController>('userController');
  }
  
  getCommandInvoker(): CommandInvoker {
    return this.container.resolve<CommandInvoker>('commandInvoker');
  }
}
```

## MVC with State Management

### State Management
```typescript
// Application state
interface AppState {
  users: User[];
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  view: 'list' | 'detail' | 'form';
}

// State manager
class StateManager {
  private state: AppState;
  private listeners: ((state: AppState) => void)[] = [];
  
  constructor(initialState: AppState) {
    this.state = initialState;
  }
  
  getState(): AppState {
    return { ...this.state };
  }
  
  setState(updates: Partial<AppState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }
  
  subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }
}

// Controller with state management
class UserController {
  private model: UserModel;
  private stateManager: StateManager;
  
  constructor(model: UserModel, stateManager: StateManager) {
    this.model = model;
    this.stateManager = stateManager;
  }
  
  async loadUsers(): Promise<void> {
    this.stateManager.setState({ loading: true, error: null });
    
    try {
      const users = await this.model.findAll();
      this.stateManager.setState({ users, loading: false });
    } catch (error) {
      this.stateManager.setState({ 
        error: 'Failed to load users', 
        loading: false 
      });
    }
  }
  
  async createUser(userData: { name: string; email: string }): Promise<void> {
    this.stateManager.setState({ loading: true, error: null });
    
    try {
      const newUser = await this.model.create(userData);
      const currentUsers = this.stateManager.getState().users;
      this.stateManager.setState({ 
        users: [...currentUsers, newUser], 
        loading: false,
        view: 'list'
      });
    } catch (error) {
      this.stateManager.setState({ 
        error: 'Failed to create user', 
        loading: false 
      });
    }
  }
}

// View with state subscription
class UserListView implements View {
  private stateManager: StateManager;
  
  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
  }
  
  render(): string {
    const state = this.stateManager.getState();
    
    if (state.loading) {
      return '<div>Loading...</div>';
    }
    
    if (state.error) {
      return `<div class="error">${state.error}</div>`;
    }
    
    return `
      <div class="user-list">
        <h2>Users</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${state.users.map(user => `
              <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.createdAt.toLocaleDateString()}</td>
                <td>
                  <button onclick="editUser('${user.id}')">Edit</button>
                  <button onclick="deleteUser('${user.id}')">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <button onclick="showCreateUserForm()">Add User</button>
      </div>
    `;
  }
}
```

## Testing MVC Components

### Model Testing
```typescript
describe('UserModel', () => {
  let model: UserModel;
  
  beforeEach(() => {
    model = new UserModel();
  });
  
  test('should create a new user', async () => {
    const userData = { name: 'John Doe', email: 'john@example.com' };
    const user = await model.create(userData);
    
    expect(user.name).toBe(userData.name);
    expect(user.email).toBe(userData.email);
    expect(user.id).toBeDefined();
    expect(user.createdAt).toBeInstanceOf(Date);
  });
  
  test('should find user by id', async () => {
    const userData = { name: 'John Doe', email: 'john@example.com' };
    const createdUser = await model.create(userData);
    const foundUser = await model.findById(createdUser.id);
    
    expect(foundUser).toEqual(createdUser);
  });
  
  test('should update user', async () => {
    const userData = { name: 'John Doe', email: 'john@example.com' };
    const user = await model.create(userData);
    const updates = { name: 'Jane Doe' };
    
    const updatedUser = await model.update(user.id, updates);
    expect(updatedUser?.name).toBe(updates.name);
    expect(updatedUser?.email).toBe(userData.email);
  });
});
```

### Controller Testing
```typescript
describe('UserController', () => {
  let controller: UserController;
  let mockModel: jest.Mocked<UserModel>;
  
  beforeEach(() => {
    mockModel = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    } as any;
    
    controller = new UserController(mockModel);
  });
  
  test('should show user list', async () => {
    const mockUsers = [
      { id: '1', name: 'John', email: 'john@example.com', createdAt: new Date(), updatedAt: new Date() }
    ];
    mockModel.findAll.mockResolvedValue(mockUsers);
    
    await controller.showUserList();
    
    expect(mockModel.findAll).toHaveBeenCalled();
  });
  
  test('should create user', async () => {
    const userData = { name: 'John', email: 'john@example.com' };
    const mockUser = { id: '1', ...userData, createdAt: new Date(), updatedAt: new Date() };
    mockModel.create.mockResolvedValue(mockUser);
    
    await controller.createUser(userData);
    
    expect(mockModel.create).toHaveBeenCalledWith(userData);
  });
});
```

### View Testing
```typescript
describe('UserListView', () => {
  let view: UserListView;
  
  beforeEach(() => {
    view = new UserListView();
  });
  
  test('should render user list', () => {
    const users = [
      { id: '1', name: 'John', email: 'john@example.com', createdAt: new Date(), updatedAt: new Date() }
    ];
    
    const html = view.render(users);
    
    expect(html).toContain('John');
    expect(html).toContain('john@example.com');
    expect(html).toContain('Edit');
    expect(html).toContain('Delete');
  });
  
  test('should render empty list', () => {
    const html = view.render([]);
    
    expect(html).toContain('Users');
    expect(html).toContain('Add User');
  });
});
```
