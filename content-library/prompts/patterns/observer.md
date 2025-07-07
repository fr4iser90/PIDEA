# Observer Design Pattern

## Overview
The Observer pattern defines a one-to-many dependency between objects so that when one object changes state, all its dependents are notified and updated automatically. This pattern is fundamental for implementing event handling systems, reactive programming, and decoupled communication between components.

## Basic Implementation

### Simple Observer Pattern
```typescript
// Subject interface
interface Subject {
  attach(observer: Observer): void;
  detach(observer: Observer): void;
  notify(): void;
}

// Observer interface
interface Observer {
  update(data: any): void;
}

// Concrete Subject
class NewsAgency implements Subject {
  private observers: Observer[] = [];
  private news: string = '';
  
  attach(observer: Observer): void {
    const isExist = this.observers.includes(observer);
    if (isExist) {
      return console.log('Observer has been attached already.');
    }
    
    console.log('Observer attached.');
    this.observers.push(observer);
  }
  
  detach(observer: Observer): void {
    const observerIndex = this.observers.indexOf(observer);
    if (observerIndex === -1) {
      return console.log('Observer not found.');
    }
    
    this.observers.splice(observerIndex, 1);
    console.log('Observer detached.');
  }
  
  notify(): void {
    console.log('Notifying observers...');
    for (const observer of this.observers) {
      observer.update(this.news);
    }
  }
  
  setNews(news: string): void {
    this.news = news;
    this.notify();
  }
}

// Concrete Observers
class NewsChannel implements Observer {
  private name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  
  update(news: string): void {
    console.log(`${this.name} received news: ${news}`);
  }
}

// Usage
const newsAgency = new NewsAgency();

const channel1 = new NewsChannel('CNN');
const channel2 = new NewsChannel('BBC');

newsAgency.attach(channel1);
newsAgency.attach(channel2);

newsAgency.setNews('Breaking: New technology breakthrough!');
// Output:
// Observer attached.
// Observer attached.
// Notifying observers...
// CNN received news: Breaking: New technology breakthrough!
// BBC received news: Breaking: New technology breakthrough!
```

## Advanced Implementations

### Event System with Type Safety
```typescript
// Event types
type EventMap = {
  'user:created': { userId: string; name: string };
  'user:updated': { userId: string; changes: any };
  'user:deleted': { userId: string };
  'order:placed': { orderId: string; amount: number };
  'order:shipped': { orderId: string; trackingNumber: string };
};

// Event emitter with type safety
class EventEmitter<T extends Record<string, any>> {
  private listeners: Map<keyof T, Set<(data: any) => void>> = new Map();
  
  on<K extends keyof T>(event: K, listener: (data: T[K]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }
  
  off<K extends keyof T>(event: K, listener: (data: T[K]) => void): void {
    this.listeners.get(event)?.delete(listener);
  }
  
  emit<K extends keyof T>(event: K, data: T[K]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${String(event)}:`, error);
        }
      });
    }
  }
  
  once<K extends keyof T>(event: K, listener: (data: T[K]) => void): () => void {
    const onceListener = (data: T[K]) => {
      listener(data);
      this.off(event, onceListener);
    };
    return this.on(event, onceListener);
  }
  
  removeAllListeners(event?: keyof T): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// Usage
const eventBus = new EventEmitter<EventMap>();

// Subscribe to events
const unsubscribe1 = eventBus.on('user:created', (data) => {
  console.log('User created:', data.name);
});

const unsubscribe2 = eventBus.on('order:placed', (data) => {
  console.log('Order placed:', data.amount);
});

// Emit events
eventBus.emit('user:created', { userId: '123', name: 'John Doe' });
eventBus.emit('order:placed', { orderId: '456', amount: 99.99 });

// Unsubscribe
unsubscribe1();
unsubscribe2();
```

### Observable Data Model
```typescript
// Observable value wrapper
class Observable<T> {
  private value: T;
  private observers: Set<(value: T) => void> = new Set();
  
  constructor(initialValue: T) {
    this.value = initialValue;
  }
  
  get(): T {
    return this.value;
  }
  
  set(newValue: T): void {
    if (this.value !== newValue) {
      this.value = newValue;
      this.notify();
    }
  }
  
  subscribe(observer: (value: T) => void): () => void {
    this.observers.add(observer);
    // Immediately notify with current value
    observer(this.value);
    
    return () => {
      this.observers.delete(observer);
    };
  }
  
  private notify(): void {
    this.observers.forEach(observer => {
      try {
        observer(this.value);
      } catch (error) {
        console.error('Error in observer:', error);
      }
    });
  }
}

// Computed observable
class Computed<T> {
  private computeFn: () => T;
  private value: T | null = null;
  private observers: Set<(value: T) => void> = new Set();
  private dependencies: Set<Observable<any>> = new Set();
  private isDirty = true;
  
  constructor(computeFn: () => T) {
    this.computeFn = computeFn;
  }
  
  get(): T {
    if (this.isDirty) {
      this.recompute();
    }
    return this.value!;
  }
  
  subscribe(observer: (value: T) => void): () => void {
    this.observers.add(observer);
    observer(this.get());
    
    return () => {
      this.observers.delete(observer);
    };
  }
  
  private recompute(): void {
    // Clear old dependencies
    this.dependencies.forEach(dep => {
      // In a real implementation, you'd need to track which observable
      // this computed depends on and remove the dependency
    });
    this.dependencies.clear();
    
    // Compute new value
    this.value = this.computeFn();
    this.isDirty = false;
    
    // Notify observers
    this.observers.forEach(observer => {
      try {
        observer(this.value!);
      } catch (error) {
        console.error('Error in computed observer:', error);
      }
    });
  }
  
  markDirty(): void {
    this.isDirty = true;
    this.observers.forEach(observer => {
      try {
        observer(this.get());
      } catch (error) {
        console.error('Error in computed observer:', error);
      }
    });
  }
}

// Usage
const firstName = new Observable('John');
const lastName = new Observable('Doe');

const fullName = new Computed(() => {
  return `${firstName.get()} ${lastName.get()}`;
});

// Subscribe to changes
fullName.subscribe((name) => {
  console.log('Full name changed to:', name);
});

// Update values
firstName.set('Jane');
lastName.set('Smith');
```

### State Management with Observer
```typescript
// State interface
interface AppState {
  user: {
    id: string | null;
    name: string;
    email: string;
  };
  theme: 'light' | 'dark';
  notifications: boolean;
}

// State manager
class StateManager {
  private state: AppState;
  private observers: Map<keyof AppState, Set<(value: any) => void>> = new Map();
  
  constructor(initialState: AppState) {
    this.state = { ...initialState };
  }
  
  getState(): AppState {
    return { ...this.state };
  }
  
  get<K extends keyof AppState>(key: K): AppState[K] {
    return this.state[key];
  }
  
  set<K extends keyof AppState>(key: K, value: AppState[K]): void {
    if (this.state[key] !== value) {
      this.state[key] = value;
      this.notify(key, value);
    }
  }
  
  subscribe<K extends keyof AppState>(
    key: K, 
    observer: (value: AppState[K]) => void
  ): () => void {
    if (!this.observers.has(key)) {
      this.observers.set(key, new Set());
    }
    
    this.observers.get(key)!.add(observer);
    
    // Immediately notify with current value
    observer(this.state[key]);
    
    return () => {
      this.observers.get(key)?.delete(observer);
    };
  }
  
  private notify<K extends keyof AppState>(key: K, value: AppState[K]): void {
    const keyObservers = this.observers.get(key);
    if (keyObservers) {
      keyObservers.forEach(observer => {
        try {
          observer(value);
        } catch (error) {
          console.error(`Error in state observer for ${String(key)}:`, error);
        }
      });
    }
  }
}

// Usage
const initialState: AppState = {
  user: {
    id: null,
    name: '',
    email: ''
  },
  theme: 'light',
  notifications: true
};

const stateManager = new StateManager(initialState);

// Subscribe to state changes
const unsubscribeUser = stateManager.subscribe('user', (user) => {
  console.log('User state changed:', user);
});

const unsubscribeTheme = stateManager.subscribe('theme', (theme) => {
  console.log('Theme changed to:', theme);
  document.body.className = theme;
});

// Update state
stateManager.set('user', {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com'
});

stateManager.set('theme', 'dark');
```

## React-Style Component System

### Component with Observer Pattern
```typescript
// Component base class
abstract class Component {
  protected state: any = {};
  protected props: any = {};
  private observers: Set<() => void> = new Set();
  
  constructor(props: any = {}) {
    this.props = props;
  }
  
  setState(newState: any): void {
    this.state = { ...this.state, ...newState };
    this.notifyObservers();
  }
  
  subscribe(observer: () => void): () => void {
    this.observers.add(observer);
    return () => {
      this.observers.delete(observer);
    };
  }
  
  private notifyObservers(): void {
    this.observers.forEach(observer => {
      try {
        observer();
      } catch (error) {
        console.error('Error in component observer:', error);
      }
    });
  }
  
  abstract render(): string;
}

// Counter component
class Counter extends Component {
  constructor(props: any) {
    super(props);
    this.state = { count: 0 };
  }
  
  increment(): void {
    this.setState({ count: this.state.count + 1 });
  }
  
  decrement(): void {
    this.setState({ count: this.state.count - 1 });
  }
  
  render(): string {
    return `
      <div class="counter">
        <h2>Count: ${this.state.count}</h2>
        <button onclick="counter.increment()">+</button>
        <button onclick="counter.decrement()">-</button>
      </div>
    `;
  }
}

// Todo list component
class TodoList extends Component {
  constructor(props: any) {
    super(props);
    this.state = { 
      todos: [],
      newTodo: ''
    };
  }
  
  addTodo(): void {
    if (this.state.newTodo.trim()) {
      const todo = {
        id: Date.now(),
        text: this.state.newTodo,
        completed: false
      };
      
      this.setState({
        todos: [...this.state.todos, todo],
        newTodo: ''
      });
    }
  }
  
  toggleTodo(id: number): void {
    const todos = this.state.todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    this.setState({ todos });
  }
  
  deleteTodo(id: number): void {
    const todos = this.state.todos.filter(todo => todo.id !== id);
    this.setState({ todos });
  }
  
  render(): string {
    return `
      <div class="todo-list">
        <h2>Todo List</h2>
        <div class="add-todo">
          <input 
            type="text" 
            value="${this.state.newTodo}"
            onchange="todoList.setState({newTodo: this.value})"
            placeholder="Add new todo"
          />
          <button onclick="todoList.addTodo()">Add</button>
        </div>
        <ul>
          ${this.state.todos.map(todo => `
            <li class="${todo.completed ? 'completed' : ''}">
              <input 
                type="checkbox" 
                ${todo.completed ? 'checked' : ''}
                onchange="todoList.toggleTodo(${todo.id})"
              />
              <span>${todo.text}</span>
              <button onclick="todoList.deleteTodo(${todo.id})">Delete</button>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }
}

// Usage
const counter = new Counter();
const todoList = new TodoList();

// Subscribe to component updates
counter.subscribe(() => {
  document.getElementById('counter-container')!.innerHTML = counter.render();
});

todoList.subscribe(() => {
  document.getElementById('todo-container')!.innerHTML = todoList.render();
});

// Initial render
document.getElementById('counter-container')!.innerHTML = counter.render();
document.getElementById('todo-container')!.innerHTML = todoList.render();
```

## Pub/Sub Pattern Implementation

### Message Broker
```typescript
// Message broker for pub/sub pattern
class MessageBroker {
  private static instance: MessageBroker;
  private topics: Map<string, Set<(message: any) => void>> = new Map();
  private messageHistory: Map<string, any[]> = new Map();
  private maxHistorySize: number = 100;
  
  private constructor() {}
  
  static getInstance(): MessageBroker {
    if (!MessageBroker.instance) {
      MessageBroker.instance = new MessageBroker();
    }
    return MessageBroker.instance;
  }
  
  publish(topic: string, message: any): void {
    console.log(`Publishing to ${topic}:`, message);
    
    // Store message in history
    if (!this.messageHistory.has(topic)) {
      this.messageHistory.set(topic, []);
    }
    
    const history = this.messageHistory.get(topic)!;
    history.push({ message, timestamp: Date.now() });
    
    // Keep only recent messages
    if (history.length > this.maxHistorySize) {
      history.splice(0, history.length - this.maxHistorySize);
    }
    
    // Notify subscribers
    const subscribers = this.topics.get(topic);
    if (subscribers) {
      subscribers.forEach(subscriber => {
        try {
          subscriber(message);
        } catch (error) {
          console.error(`Error in subscriber for topic ${topic}:`, error);
        }
      });
    }
  }
  
  subscribe(topic: string, subscriber: (message: any) => void): () => void {
    if (!this.topics.has(topic)) {
      this.topics.set(topic, new Set());
    }
    
    this.topics.get(topic)!.add(subscriber);
    
    // Send recent messages to new subscriber
    const history = this.messageHistory.get(topic);
    if (history && history.length > 0) {
      const recentMessage = history[history.length - 1];
      subscriber(recentMessage.message);
    }
    
    return () => {
      this.topics.get(topic)?.delete(subscriber);
    };
  }
  
  unsubscribe(topic: string, subscriber: (message: any) => void): void {
    this.topics.get(topic)?.delete(subscriber);
  }
  
  getMessageHistory(topic: string): any[] {
    return this.messageHistory.get(topic) || [];
  }
  
  clearHistory(topic?: string): void {
    if (topic) {
      this.messageHistory.delete(topic);
    } else {
      this.messageHistory.clear();
    }
  }
}

// Usage
const broker = MessageBroker.getInstance();

// Subscribe to topics
const unsubscribeUserEvents = broker.subscribe('user.events', (event) => {
  console.log('User event received:', event);
});

const unsubscribeSystemLogs = broker.subscribe('system.logs', (log) => {
  console.log('System log:', log);
});

// Publish messages
broker.publish('user.events', { type: 'login', userId: '123' });
broker.publish('system.logs', { level: 'info', message: 'System started' });
broker.publish('user.events', { type: 'logout', userId: '123' });

// Unsubscribe
unsubscribeUserEvents();
unsubscribeSystemLogs();
```

## Testing Observer Pattern

### Unit Tests
```typescript
describe('Observer Pattern', () => {
  let newsAgency: NewsAgency;
  let channel1: NewsChannel;
  let channel2: NewsChannel;
  
  beforeEach(() => {
    newsAgency = new NewsAgency();
    channel1 = new NewsChannel('CNN');
    channel2 = new NewsChannel('BBC');
  });
  
  test('should attach observers', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    newsAgency.attach(channel1);
    newsAgency.attach(channel2);
    
    expect(consoleSpy).toHaveBeenCalledWith('Observer attached.');
    expect(consoleSpy).toHaveBeenCalledTimes(2);
    
    consoleSpy.mockRestore();
  });
  
  test('should notify all observers', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    newsAgency.attach(channel1);
    newsAgency.attach(channel2);
    newsAgency.setNews('Breaking news!');
    
    expect(consoleSpy).toHaveBeenCalledWith('CNN received news: Breaking news!');
    expect(consoleSpy).toHaveBeenCalledWith('BBC received news: Breaking news!');
    
    consoleSpy.mockRestore();
  });
  
  test('should detach observers', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    newsAgency.attach(channel1);
    newsAgency.detach(channel1);
    newsAgency.setNews('Breaking news!');
    
    expect(consoleSpy).toHaveBeenCalledWith('Observer detached.');
    expect(consoleSpy).not.toHaveBeenCalledWith('CNN received news: Breaking news!');
    
    consoleSpy.mockRestore();
  });
});

describe('EventEmitter', () => {
  let eventEmitter: EventEmitter<EventMap>;
  
  beforeEach(() => {
    eventEmitter = new EventEmitter<EventMap>();
  });
  
  test('should emit and receive events', () => {
    const mockListener = jest.fn();
    
    eventEmitter.on('user:created', mockListener);
    eventEmitter.emit('user:created', { userId: '123', name: 'John' });
    
    expect(mockListener).toHaveBeenCalledWith({ userId: '123', name: 'John' });
  });
  
  test('should handle unsubscribe', () => {
    const mockListener = jest.fn();
    
    const unsubscribe = eventEmitter.on('user:created', mockListener);
    unsubscribe();
    
    eventEmitter.emit('user:created', { userId: '123', name: 'John' });
    
    expect(mockListener).not.toHaveBeenCalled();
  });
  
  test('should handle once events', () => {
    const mockListener = jest.fn();
    
    eventEmitter.once('user:created', mockListener);
    eventEmitter.emit('user:created', { userId: '123', name: 'John' });
    eventEmitter.emit('user:created', { userId: '456', name: 'Jane' });
    
    expect(mockListener).toHaveBeenCalledTimes(1);
    expect(mockListener).toHaveBeenCalledWith({ userId: '123', name: 'John' });
  });
});
```

## Performance Optimizations

### Debounced Observer
```typescript
class DebouncedObserver<T> {
  private observers: Set<(value: T) => void> = new Set();
  private timeoutId: NodeJS.Timeout | null = null;
  private lastValue: T | null = null;
  private delay: number;
  
  constructor(delay: number = 100) {
    this.delay = delay;
  }
  
  subscribe(observer: (value: T) => void): () => void {
    this.observers.add(observer);
    
    // Send current value immediately
    if (this.lastValue !== null) {
      observer(this.lastValue);
    }
    
    return () => {
      this.observers.delete(observer);
    };
  }
  
  notify(value: T): void {
    this.lastValue = value;
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    this.timeoutId = setTimeout(() => {
      this.observers.forEach(observer => {
        try {
          observer(value);
        } catch (error) {
          console.error('Error in debounced observer:', error);
        }
      });
      this.timeoutId = null;
    }, this.delay);
  }
  
  flush(): void {
    if (this.timeoutId && this.lastValue !== null) {
      clearTimeout(this.timeoutId);
      this.observers.forEach(observer => {
        try {
          observer(this.lastValue!);
        } catch (error) {
          console.error('Error in debounced observer:', error);
        }
      });
      this.timeoutId = null;
    }
  }
}

// Usage
const debouncedObserver = new DebouncedObserver<string>(200);

debouncedObserver.subscribe((value) => {
  console.log('Debounced value:', value);
});

// Multiple rapid updates
debouncedObserver.notify('update 1');
debouncedObserver.notify('update 2');
debouncedObserver.notify('update 3');
// Only "update 3" will be logged after 200ms
```
