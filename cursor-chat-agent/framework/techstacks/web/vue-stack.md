# Vue.js Tech Stack

## Overview
Vue.js is a progressive JavaScript framework for building user interfaces. This tech stack covers modern Vue.js development patterns, state management, routing, and ecosystem integration.

## Core Architecture

### Vue 3 Composition API
```javascript
import { ref, reactive, computed, watch, onMounted } from 'vue';

export default {
  setup() {
    // Reactive state
    const count = ref(0);
    const user = reactive({
      name: 'John Doe',
      email: 'john@example.com',
      preferences: {
        theme: 'dark',
        notifications: true
      }
    });

    // Computed properties
    const doubleCount = computed(() => count.value * 2);
    const userDisplayName = computed(() => {
      return user.name || user.email.split('@')[0];
    });

    // Watchers
    watch(count, (newValue, oldValue) => {
      console.log(`Count changed from ${oldValue} to ${newValue}`);
    });

    watch(() => user.preferences.theme, (newTheme) => {
      document.documentElement.setAttribute('data-theme', newTheme);
    }, { immediate: true });

    // Lifecycle hooks
    onMounted(() => {
      console.log('Component mounted');
      fetchUserData();
    });

    // Methods
    const increment = () => {
      count.value++;
    };

    const updateUser = (updates) => {
      Object.assign(user, updates);
    };

    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/user');
        const data = await response.json();
        updateUser(data);
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    };

    return {
      count,
      user,
      doubleCount,
      userDisplayName,
      increment,
      updateUser
    };
  }
};
```

### Component Architecture
```javascript
// Base Component
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'BaseComponent',
  props: {
    title: {
      type: String,
      required: true,
      validator: (value) => value.length > 0
    },
    count: {
      type: Number,
      default: 0
    },
    items: {
      type: Array,
      default: () => []
    }
  },
  emits: ['update', 'delete'],
  setup(props, { emit }) {
    const handleUpdate = (data) => {
      emit('update', data);
    };

    const handleDelete = (id) => {
      emit('delete', id);
    };

    return {
      handleUpdate,
      handleDelete
    };
  }
});

// Functional Component
const FunctionalButton = defineComponent({
  name: 'FunctionalButton',
  functional: true,
  props: {
    type: {
      type: String,
      default: 'button'
    },
    variant: {
      type: String,
      default: 'primary'
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  render(h, { props, listeners, children }) {
    return h('button', {
      class: [`btn btn-${props.variant}`],
      attrs: {
        type: props.type,
        disabled: props.disabled
      },
      on: listeners
    }, children);
  }
});
```

### Custom Composable
```javascript
// useCounter.js
import { ref, computed } from 'vue';

export function useCounter(initialValue = 0) {
  const count = ref(initialValue);
  
  const double = computed(() => count.value * 2);
  const isEven = computed(() => count.value % 2 === 0);
  
  const increment = () => count.value++;
  const decrement = () => count.value--;
  const reset = () => count.value = initialValue;
  const setValue = (value) => count.value = value;
  
  return {
    count: readonly(count),
    double,
    isEven,
    increment,
    decrement,
    reset,
    setValue
  };
}

// useLocalStorage.js
import { ref, watch } from 'vue';

export function useLocalStorage(key, defaultValue = null) {
  const storedValue = localStorage.getItem(key);
  const value = ref(storedValue ? JSON.parse(storedValue) : defaultValue);
  
  watch(value, (newValue) => {
    if (newValue === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(newValue));
    }
  }, { deep: true });
  
  return value;
}

// useApi.js
import { ref, computed } from 'vue';

export function useApi(apiFunction) {
  const data = ref(null);
  const loading = ref(false);
  const error = ref(null);
  
  const execute = async (...args) => {
    loading.value = true;
    error.value = null;
    
    try {
      data.value = await apiFunction(...args);
    } catch (err) {
      error.value = err;
    } finally {
      loading.value = false;
    }
  };
  
  const hasData = computed(() => data.value !== null);
  const hasError = computed(() => error.value !== null);
  
  return {
    data: readonly(data),
    loading: readonly(loading),
    error: readonly(error),
    hasData,
    hasError,
    execute
  };
}
```

## State Management

### Pinia Store
```javascript
import { defineStore } from 'pinia';

// User Store
export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    isAuthenticated: false,
    preferences: {
      theme: 'light',
      language: 'en',
      notifications: true
    }
  }),

  getters: {
    displayName: (state) => {
      return state.user?.displayName || state.user?.email?.split('@')[0] || 'Guest';
    },
    
    hasPermission: (state) => (permission) => {
      return state.user?.permissions?.includes(permission) || false;
    },
    
    isAdmin: (state) => {
      return state.hasPermission('admin');
    }
  },

  actions: {
    async login(credentials) {
      try {
        const response = await api.auth.login(credentials);
        this.user = response.user;
        this.isAuthenticated = true;
        this.loadPreferences();
      } catch (error) {
        throw new Error('Login failed');
      }
    },

    async logout() {
      try {
        await api.auth.logout();
        this.user = null;
        this.isAuthenticated = false;
        this.preferences = {
          theme: 'light',
          language: 'en',
          notifications: true
        };
      } catch (error) {
        console.error('Logout error:', error);
      }
    },

    updatePreferences(updates) {
      this.preferences = { ...this.preferences, ...updates };
      this.savePreferences();
    },

    async loadPreferences() {
      try {
        const prefs = await api.user.getPreferences();
        this.preferences = { ...this.preferences, ...prefs };
      } catch (error) {
        console.error('Failed to load preferences:', error);
      }
    },

    async savePreferences() {
      try {
        await api.user.updatePreferences(this.preferences);
      } catch (error) {
        console.error('Failed to save preferences:', error);
      }
    }
  }
});

// Cart Store
export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [],
    isOpen: false
  }),

  getters: {
    totalItems: (state) => {
      return state.items.reduce((sum, item) => sum + item.quantity, 0);
    },

    totalPrice: (state) => {
      return state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },

    isEmpty: (state) => {
      return state.items.length === 0;
    }
  },

  actions: {
    addItem(product, quantity = 1) {
      const existingItem = this.items.find(item => item.id === product.id);
      
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        this.items.push({
          id: product.id,
          name: product.name,
          price: product.price,
          quantity
        });
      }
    },

    removeItem(productId) {
      const index = this.items.findIndex(item => item.id === productId);
      if (index > -1) {
        this.items.splice(index, 1);
      }
    },

    updateQuantity(productId, quantity) {
      const item = this.items.find(item => item.id === productId);
      if (item) {
        item.quantity = Math.max(0, quantity);
        if (item.quantity === 0) {
          this.removeItem(productId);
        }
      }
    },

    clearCart() {
      this.items = [];
    },

    async checkout() {
      try {
        const order = await api.orders.create({
          items: this.items,
          total: this.totalPrice
        });
        
        this.clearCart();
        return order;
      } catch (error) {
        throw new Error('Checkout failed');
      }
    }
  }
});
```

### Store Composition
```javascript
// useStore.js
import { useUserStore } from '@/stores/user';
import { useCartStore } from '@/stores/cart';
import { useProductStore } from '@/stores/product';

export function useStore() {
  const userStore = useUserStore();
  const cartStore = useCartStore();
  const productStore = useProductStore();

  return {
    user: userStore,
    cart: cartStore,
    product: productStore
  };
}

// Store Plugin
import { createPinia } from 'pinia';

const pinia = createPinia();

// Persist plugin
pinia.use(({ store }) => {
  const storageKey = `store-${store.$id}`;
  
  // Load state from localStorage
  const savedState = localStorage.getItem(storageKey);
  if (savedState) {
    store.$patch(JSON.parse(savedState));
  }
  
  // Save state to localStorage on changes
  store.$subscribe((mutation, state) => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  });
});

export default pinia;
```

## Routing

### Vue Router Configuration
```javascript
import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '@/stores/user';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: {
      title: 'Home',
      requiresAuth: false
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: {
      title: 'Login',
      requiresAuth: false,
      guestOnly: true
    }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: {
      title: 'Dashboard',
      requiresAuth: true
    },
    children: [
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/Profile.vue'),
        meta: {
          title: 'Profile'
        }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/Settings.vue'),
        meta: {
          title: 'Settings'
        }
      }
    ]
  },
  {
    path: '/products',
    name: 'Products',
    component: () => import('@/views/Products.vue'),
    meta: {
      title: 'Products'
    }
  },
  {
    path: '/products/:id',
    name: 'ProductDetail',
    component: () => import('@/views/ProductDetail.vue'),
    meta: {
      title: 'Product Detail'
    },
    props: true
  },
  {
    path: '/cart',
    name: 'Cart',
    component: () => import('@/views/Cart.vue'),
    meta: {
      title: 'Shopping Cart'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: {
      title: 'Page Not Found'
    }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  }
});

// Navigation Guards
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore();
  
  // Update page title
  document.title = to.meta.title ? `${to.meta.title} - My App` : 'My App';
  
  // Check authentication
  if (to.meta.requiresAuth && !userStore.isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } });
    return;
  }
  
  // Redirect authenticated users from guest-only pages
  if (to.meta.guestOnly && userStore.isAuthenticated) {
    next({ name: 'Dashboard' });
    return;
  }
  
  next();
});

export default router;
```

### Route Composition
```javascript
// useRouter.js
import { useRouter, useRoute } from 'vue-router';
import { computed } from 'vue';

export function useAppRouter() {
  const router = useRouter();
  const route = useRoute();

  const currentRoute = computed(() => route);
  const routeParams = computed(() => route.params);
  const routeQuery = computed(() => route.query);
  const routeMeta = computed(() => route.meta);

  const navigateTo = (name, params = {}, query = {}) => {
    return router.push({ name, params, query });
  };

  const replaceTo = (name, params = {}, query = {}) => {
    return router.replace({ name, params, query });
  };

  const goBack = () => {
    return router.back();
  };

  const goForward = () => {
    return router.forward();
  };

  const isActiveRoute = (name) => {
    return route.name === name;
  };

  const hasRouteParam = (param) => {
    return param in route.params;
  };

  const getRouteParam = (param) => {
    return route.params[param];
  };

  return {
    router,
    route,
    currentRoute,
    routeParams,
    routeQuery,
    routeMeta,
    navigateTo,
    replaceTo,
    goBack,
    goForward,
    isActiveRoute,
    hasRouteParam,
    getRouteParam
  };
}
```

## HTTP Client

### Axios Configuration
```javascript
import axios from 'axios';
import { useUserStore } from '@/stores/user';

// Create axios instance
const api = axios.create({
  baseURL: process.env.VUE_APP_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const userStore = useUserStore();
    
    if (userStore.isAuthenticated && userStore.user?.token) {
      config.headers.Authorization = `Bearer ${userStore.user.token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      const userStore = useUserStore();
      userStore.logout();
      router.push('/login');
    }
    
    return Promise.reject(error);
  }
);

// API modules
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password })
};

export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
  getPreferences: () => api.get('/user/preferences'),
  updatePreferences: (preferences) => api.put('/user/preferences', preferences),
  changePassword: (passwords) => api.put('/user/password', passwords)
};

export const productAPI = {
  getProducts: (params) => api.get('/products', { params }),
  getProduct: (id) => api.get(`/products/${id}`),
  createProduct: (data) => api.post('/products', data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/products/${id}`),
  searchProducts: (query) => api.get('/products/search', { params: { q: query } })
};

export const orderAPI = {
  getOrders: (params) => api.get('/orders', { params }),
  getOrder: (id) => api.get(`/orders/${id}`),
  createOrder: (data) => api.post('/orders', data),
  updateOrder: (id, data) => api.put(`/orders/${id}`, data),
  cancelOrder: (id) => api.post(`/orders/${id}/cancel`)
};

export default api;
```

### API Composition
```javascript
// useApi.js
import { ref, computed } from 'vue';
import { productAPI } from '@/api';

export function useProducts() {
  const products = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0
  });

  const fetchProducts = async (params = {}) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await productAPI.getProducts({
        page: pagination.value.page,
        limit: pagination.value.limit,
        ...params
      });
      
      products.value = response.data;
      pagination.value = {
        page: response.page,
        limit: response.limit,
        total: response.total
      };
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  const searchProducts = async (query) => {
    if (!query.trim()) {
      await fetchProducts();
      return;
    }
    
    loading.value = true;
    error.value = null;
    
    try {
      const response = await productAPI.searchProducts(query);
      products.value = response.data;
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  const hasMorePages = computed(() => {
    return pagination.value.page * pagination.value.limit < pagination.value.total;
  });

  const nextPage = () => {
    if (hasMorePages.value) {
      pagination.value.page++;
      fetchProducts();
    }
  };

  const previousPage = () => {
    if (pagination.value.page > 1) {
      pagination.value.page--;
      fetchProducts();
    }
  };

  return {
    products: readonly(products),
    loading: readonly(loading),
    error: readonly(error),
    pagination: readonly(pagination),
    hasMorePages,
    fetchProducts,
    searchProducts,
    nextPage,
    previousPage
  };
}
```

## UI Components

### Base Components
```javascript
// BaseButton.vue
<template>
  <button
    :class="buttonClasses"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="spinner"></span>
    <slot v-else />
  </button>
</template>

<script>
import { computed } from 'vue';

export default {
  name: 'BaseButton',
  props: {
    variant: {
      type: String,
      default: 'primary',
      validator: (value) => ['primary', 'secondary', 'success', 'danger', 'warning', 'info'].includes(value)
    },
    size: {
      type: String,
      default: 'medium',
      validator: (value) => ['small', 'medium', 'large'].includes(value)
    },
    disabled: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    },
    block: {
      type: Boolean,
      default: false
    }
  },
  emits: ['click'],
  setup(props, { emit }) {
    const buttonClasses = computed(() => [
      'btn',
      `btn-${props.variant}`,
      `btn-${props.size}`,
      {
        'btn-block': props.block,
        'btn-loading': props.loading
      }
    ]);

    const handleClick = (event) => {
      if (!props.disabled && !props.loading) {
        emit('click', event);
      }
    };

    return {
      buttonClasses,
      handleClick
    };
  }
};
</script>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-small {
  padding: 8px 16px;
  font-size: 14px;
}

.btn-medium {
  padding: 12px 24px;
  font-size: 16px;
}

.btn-large {
  padding: 16px 32px;
  font-size: 18px;
}

.btn-block {
  width: 100%;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
```

### Form Components
```javascript
// BaseInput.vue
<template>
  <div class="form-group">
    <label v-if="label" :for="id" class="form-label">
      {{ label }}
      <span v-if="required" class="required">*</span>
    </label>
    
    <input
      :id="id"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :class="inputClasses"
      @input="handleInput"
      @blur="handleBlur"
      @focus="handleFocus"
    />
    
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    
    <div v-if="hint" class="hint">
      {{ hint }}
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';

export default {
  name: 'BaseInput',
  props: {
    modelValue: {
      type: [String, Number],
      default: ''
    },
    type: {
      type: String,
      default: 'text'
    },
    label: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: ''
    },
    required: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    },
    readonly: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: ''
    },
    hint: {
      type: String,
      default: ''
    },
    size: {
      type: String,
      default: 'medium',
      validator: (value) => ['small', 'medium', 'large'].includes(value)
    }
  },
  emits: ['update:modelValue', 'blur', 'focus'],
  setup(props, { emit }) {
    const id = `input-${Math.random().toString(36).substr(2, 9)}`;

    const inputClasses = computed(() => [
      'form-input',
      `form-input-${props.size}`,
      {
        'form-input-error': props.error,
        'form-input-disabled': props.disabled
      }
    ]);

    const handleInput = (event) => {
      emit('update:modelValue', event.target.value);
    };

    const handleBlur = (event) => {
      emit('blur', event);
    };

    const handleFocus = (event) => {
      emit('focus', event);
    };

    return {
      id,
      inputClasses,
      handleInput,
      handleBlur,
      handleFocus
    };
  }
};
</script>
```

## Testing

### Component Testing
```javascript
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import BaseButton from '@/components/BaseButton.vue';

// Test utilities
const createTestRouter = () => {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: { template: '<div>Home</div>' } },
      { path: '/about', component: { template: '<div>About</div>' } }
    ]
  });
};

const createTestPinia = () => {
  return createPinia();
};

// Component tests
describe('BaseButton', () => {
  it('renders correctly with default props', () => {
    const wrapper = mount(BaseButton, {
      slots: {
        default: 'Click me'
      }
    });

    expect(wrapper.text()).toBe('Click me');
    expect(wrapper.classes()).toContain('btn');
    expect(wrapper.classes()).toContain('btn-primary');
    expect(wrapper.classes()).toContain('btn-medium');
  });

  it('applies variant classes correctly', () => {
    const wrapper = mount(BaseButton, {
      props: {
        variant: 'success'
      },
      slots: {
        default: 'Success Button'
      }
    });

    expect(wrapper.classes()).toContain('btn-success');
  });

  it('emits click event when clicked', async () => {
    const wrapper = mount(BaseButton, {
      slots: {
        default: 'Click me'
      }
    });

    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeTruthy();
  });

  it('does not emit click when disabled', async () => {
    const wrapper = mount(BaseButton, {
      props: {
        disabled: true
      },
      slots: {
        default: 'Disabled Button'
      }
    });

    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeFalsy();
  });

  it('shows loading state correctly', () => {
    const wrapper = mount(BaseButton, {
      props: {
        loading: true
      },
      slots: {
        default: 'Loading Button'
      }
    });

    expect(wrapper.find('.spinner').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Loading Button');
  });
});

// Store tests
import { setActivePinia, createPinia } from 'pinia';
import { useUserStore } from '@/stores/user';

describe('User Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('initializes with default state', () => {
    const store = useUserStore();
    
    expect(store.user).toBeNull();
    expect(store.isAuthenticated).toBe(false);
    expect(store.preferences.theme).toBe('light');
  });

  it('updates preferences correctly', () => {
    const store = useUserStore();
    
    store.updatePreferences({ theme: 'dark' });
    
    expect(store.preferences.theme).toBe('dark');
  });

  it('computes display name correctly', () => {
    const store = useUserStore();
    
    store.user = { displayName: 'John Doe' };
    expect(store.displayName).toBe('John Doe');
    
    store.user = { email: 'john@example.com' };
    expect(store.displayName).toBe('john');
    
    store.user = null;
    expect(store.displayName).toBe('Guest');
  });
});
```

## Performance Optimization

### Lazy Loading
```javascript
// Lazy component loading
const LazyComponent = defineAsyncComponent(() => import('./HeavyComponent.vue'));

// Route-based code splitting
const routes = [
  {
    path: '/dashboard',
    component: () => import('@/views/Dashboard.vue')
  }
];

// Dynamic imports with loading states
const AsyncComponent = defineAsyncComponent({
  loader: () => import('./HeavyComponent.vue'),
  loadingComponent: LoadingSpinner,
  errorComponent: ErrorComponent,
  delay: 200,
  timeout: 3000
});
```

### Virtual Scrolling
```javascript
// VirtualList.vue
<template>
  <div class="virtual-list" :style="{ height: `${totalHeight}px` }">
    <div class="virtual-list-content" :style="{ transform: `translateY(${offsetY}px)` }">
      <div
        v-for="item in visibleItems"
        :key="item.id"
        :style="{ height: `${itemHeight}px` }"
        class="virtual-list-item"
      >
        <slot :item="item" />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';

export default {
  name: 'VirtualList',
  props: {
    items: {
      type: Array,
      required: true
    },
    itemHeight: {
      type: Number,
      required: true
    },
    containerHeight: {
      type: Number,
      required: true
    }
  },
  setup(props) {
    const scrollTop = ref(0);
    const containerRef = ref(null);

    const totalHeight = computed(() => props.items.length * props.itemHeight);
    
    const startIndex = computed(() => {
      return Math.floor(scrollTop.value / props.itemHeight);
    });
    
    const endIndex = computed(() => {
      const visibleCount = Math.ceil(props.containerHeight / props.itemHeight);
      return Math.min(startIndex.value + visibleCount + 1, props.items.length);
    });
    
    const visibleItems = computed(() => {
      return props.items.slice(startIndex.value, endIndex.value);
    });
    
    const offsetY = computed(() => {
      return startIndex.value * props.itemHeight;
    });

    const handleScroll = (event) => {
      scrollTop.value = event.target.scrollTop;
    };

    onMounted(() => {
      if (containerRef.value) {
        containerRef.value.addEventListener('scroll', handleScroll);
      }
    });

    onUnmounted(() => {
      if (containerRef.value) {
        containerRef.value.removeEventListener('scroll', handleScroll);
      }
    });

    return {
      containerRef,
      totalHeight,
      visibleItems,
      offsetY
    };
  }
};
</script>
```

## Best Practices

### Code Organization
- Use composition API for complex logic
- Create reusable composables
- Organize components by feature
- Use consistent naming conventions
- Implement proper error boundaries

### Performance
- Use lazy loading for routes and components
- Implement virtual scrolling for large lists
- Optimize bundle size with tree shaking
- Use computed properties for expensive calculations
- Implement proper caching strategies

### State Management
- Keep stores focused and modular
- Use getters for derived state
- Implement proper error handling
- Use actions for async operations
- Consider persistence for important state

### Testing
- Write unit tests for components
- Test store actions and getters
- Mock external dependencies
- Test user interactions
- Implement integration tests
