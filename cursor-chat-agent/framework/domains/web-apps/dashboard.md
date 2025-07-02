# Dashboard Application Pattern

## Overview
Dashboard applications provide real-time data visualization, analytics, and user interaction capabilities. This pattern covers modern dashboard architectures, data management, and user experience considerations.

## Architecture Patterns

### Component-Based Dashboard
```javascript
// Dashboard Container
class DashboardContainer {
  constructor() {
    this.widgets = new Map();
    this.dataSources = new Map();
    this.layout = new GridLayout();
  }

  addWidget(widget) {
    this.widgets.set(widget.id, widget);
    this.layout.addWidget(widget);
  }

  updateData(dataSourceId, data) {
    const widgets = this.getWidgetsByDataSource(dataSourceId);
    widgets.forEach(widget => widget.updateData(data));
  }
}

// Widget Base Class
class DashboardWidget {
  constructor(config) {
    this.id = config.id;
    this.type = config.type;
    this.dataSource = config.dataSource;
    this.position = config.position;
    this.size = config.size;
  }

  updateData(data) {
    this.render(data);
  }

  render(data) {
    // Override in subclasses
  }
}
```

### Real-Time Data Management
```javascript
class RealTimeDataManager {
  constructor() {
    this.subscribers = new Map();
    this.websocket = null;
    this.reconnectAttempts = 0;
  }

  connect(endpoint) {
    this.websocket = new WebSocket(endpoint);
    this.websocket.onmessage = this.handleMessage.bind(this);
    this.websocket.onclose = this.handleDisconnect.bind(this);
  }

  subscribe(dataType, callback) {
    if (!this.subscribers.has(dataType)) {
      this.subscribers.set(dataType, []);
    }
    this.subscribers.get(dataType).push(callback);
  }

  handleMessage(event) {
    const data = JSON.parse(event.data);
    const subscribers = this.subscribers.get(data.type) || [];
    subscribers.forEach(callback => callback(data.payload));
  }
}
```

## Widget Types

### Chart Widgets
```javascript
class ChartWidget extends DashboardWidget {
  constructor(config) {
    super(config);
    this.chartType = config.chartType;
    this.chart = null;
  }

  render(data) {
    const ctx = this.getCanvasContext();
    this.chart = new Chart(ctx, {
      type: this.chartType,
      data: this.transformData(data),
      options: this.getChartOptions()
    });
  }

  transformData(rawData) {
    // Transform raw data to chart format
    return {
      labels: rawData.map(item => item.label),
      datasets: [{
        data: rawData.map(item => item.value),
        backgroundColor: this.getColorScheme()
      }]
    };
  }
}
```

### Metric Widgets
```javascript
class MetricWidget extends DashboardWidget {
  constructor(config) {
    super(config);
    this.format = config.format;
    this.trend = config.showTrend;
  }

  render(data) {
    const container = this.getContainer();
    container.innerHTML = `
      <div class="metric-value">${this.formatValue(data.value)}</div>
      ${this.trend ? this.renderTrend(data.trend) : ''}
      <div class="metric-label">${data.label}</div>
    `;
  }

  formatValue(value) {
    switch (this.format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      default:
        return value.toLocaleString();
    }
  }
}
```

### Table Widgets
```javascript
class TableWidget extends DashboardWidget {
  constructor(config) {
    super(config);
    this.columns = config.columns;
    this.sortable = config.sortable || false;
    this.paginated = config.paginated || false;
  }

  render(data) {
    const table = this.createTable(data);
    this.getContainer().appendChild(table);
  }

  createTable(data) {
    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>${this.columns.map(col => `<th>${col.label}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${data.map(row => this.createTableRow(row)).join('')}
      </tbody>
    `;
    return table;
  }
}
```

## Layout Management

### Grid Layout System
```javascript
class GridLayout {
  constructor(columns = 12) {
    this.columns = columns;
    this.grid = [];
    this.widgets = new Map();
  }

  addWidget(widget) {
    const position = this.findAvailablePosition(widget.size);
    this.placeWidget(widget, position);
  }

  placeWidget(widget, position) {
    for (let row = position.row; row < position.row + widget.size.height; row++) {
      for (let col = position.col; col < position.col + widget.size.width; col++) {
        this.grid[row][col] = widget.id;
      }
    }
    this.widgets.set(widget.id, { widget, position });
  }

  findAvailablePosition(size) {
    // Find first available position for widget
    for (let row = 0; row < this.grid.length; row++) {
      for (let col = 0; col < this.columns; col++) {
        if (this.canPlaceWidget(size, row, col)) {
          return { row, col };
        }
      }
    }
    return { row: this.grid.length, col: 0 };
  }
}
```

### Responsive Layout
```javascript
class ResponsiveLayout extends GridLayout {
  constructor() {
    super();
    this.breakpoints = {
      mobile: 768,
      tablet: 1024,
      desktop: 1200
    };
  }

  updateLayout(screenWidth) {
    const breakpoint = this.getBreakpoint(screenWidth);
    this.widgets.forEach(({ widget, position }) => {
      const newSize = this.calculateResponsiveSize(widget, breakpoint);
      widget.resize(newSize);
    });
  }

  calculateResponsiveSize(widget, breakpoint) {
    const baseSize = widget.baseSize;
    switch (breakpoint) {
      case 'mobile':
        return { width: this.columns, height: baseSize.height * 1.5 };
      case 'tablet':
        return { width: Math.min(baseSize.width * 1.2, this.columns), height: baseSize.height };
      default:
        return baseSize;
    }
  }
}
```

## Data Management

### Data Aggregation
```javascript
class DataAggregator {
  constructor() {
    this.aggregators = new Map();
  }

  registerAggregator(type, aggregator) {
    this.aggregators.set(type, aggregator);
  }

  aggregate(data, type, options) {
    const aggregator = this.aggregators.get(type);
    if (!aggregator) {
      throw new Error(`Unknown aggregator type: ${type}`);
    }
    return aggregator(data, options);
  }
}

// Built-in aggregators
const builtInAggregators = {
  sum: (data, field) => data.reduce((sum, item) => sum + item[field], 0),
  average: (data, field) => data.reduce((sum, item) => sum + item[field], 0) / data.length,
  count: (data) => data.length,
  min: (data, field) => Math.min(...data.map(item => item[field])),
  max: (data, field) => Math.max(...data.map(item => item[field]))
};
```

### Caching Strategy
```javascript
class DashboardCache {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map();
  }

  set(key, data, ttlMs = 300000) { // 5 minutes default
    this.cache.set(key, data);
    this.ttl.set(key, Date.now() + ttlMs);
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    if (Date.now() > this.ttl.get(key)) {
      this.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  delete(key) {
    this.cache.delete(key);
    this.ttl.delete(key);
  }
}
```

## Performance Optimization

### Lazy Loading
```javascript
class LazyLoadingManager {
  constructor() {
    this.observers = new Map();
    this.intersectionObserver = new IntersectionObserver(
      this.handleIntersection.bind(this),
      { threshold: 0.1 }
    );
  }

  observeWidget(widget) {
    this.intersectionObserver.observe(widget.element);
    this.observers.set(widget.element, widget);
  }

  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const widget = this.observers.get(entry.target);
        if (widget && !widget.loaded) {
          widget.load();
          this.intersectionObserver.unobserve(entry.target);
        }
      }
    });
  }
}
```

### Data Virtualization
```javascript
class VirtualizedTable {
  constructor(container, data, rowHeight = 40) {
    this.container = container;
    this.data = data;
    this.rowHeight = rowHeight;
    this.visibleRows = Math.ceil(container.clientHeight / rowHeight);
    this.scrollTop = 0;
    this.setupVirtualization();
  }

  setupVirtualization() {
    this.container.style.height = `${this.data.length * this.rowHeight}px`;
    this.container.addEventListener('scroll', this.handleScroll.bind(this));
    this.renderVisibleRows();
  }

  renderVisibleRows() {
    const startIndex = Math.floor(this.scrollTop / this.rowHeight);
    const endIndex = Math.min(startIndex + this.visibleRows, this.data.length);
    
    this.container.innerHTML = '';
    for (let i = startIndex; i < endIndex; i++) {
      const row = this.createRow(this.data[i], i);
      row.style.position = 'absolute';
      row.style.top = `${i * this.rowHeight}px`;
      this.container.appendChild(row);
    }
  }
}
```

## User Experience

### Drag and Drop
```javascript
class DragAndDropManager {
  constructor(layout) {
    this.layout = layout;
    this.draggedWidget = null;
    this.dropZones = new Map();
  }

  enableDragAndDrop(widget) {
    widget.element.draggable = true;
    widget.element.addEventListener('dragstart', this.handleDragStart.bind(this));
    widget.element.addEventListener('dragend', this.handleDragEnd.bind(this));
  }

  createDropZone(zone) {
    zone.addEventListener('dragover', this.handleDragOver.bind(this));
    zone.addEventListener('drop', this.handleDrop.bind(this));
    this.dropZones.set(zone, true);
  }

  handleDrop(event, dropZone) {
    event.preventDefault();
    if (this.draggedWidget) {
      const newPosition = this.calculateDropPosition(event, dropZone);
      this.layout.moveWidget(this.draggedWidget, newPosition);
    }
  }
}
```

### Theme Management
```javascript
class DashboardTheme {
  constructor() {
    this.themes = new Map();
    this.currentTheme = 'light';
  }

  registerTheme(name, theme) {
    this.themes.set(name, theme);
  }

  setTheme(name) {
    if (!this.themes.has(name)) {
      throw new Error(`Theme not found: ${name}`);
    }
    
    this.currentTheme = name;
    const theme = this.themes.get(name);
    this.applyTheme(theme);
  }

  applyTheme(theme) {
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    
    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value);
    });
  }
}
```

## Security Considerations

### Data Sanitization
```javascript
class DataSanitizer {
  static sanitizeHtml(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  static validateData(data, schema) {
    // Validate data against schema
    return schema.validate(data);
  }

  static escapeSql(input) {
    return input.replace(/['";\\]/g, '\\$&');
  }
}
```

### Access Control
```javascript
class DashboardAccessControl {
  constructor() {
    this.permissions = new Map();
    this.roles = new Map();
  }

  checkPermission(user, action, resource) {
    const userPermissions = this.permissions.get(user.id) || [];
    return userPermissions.some(permission => 
      permission.action === action && permission.resource === resource
    );
  }

  filterDataByPermissions(data, user) {
    return data.filter(item => 
      this.checkPermission(user, 'read', item.type)
    );
  }
}
```

## Testing Strategies

### Widget Testing
```javascript
class WidgetTestSuite {
  constructor(widget) {
    this.widget = widget;
  }

  testDataUpdate() {
    const testData = { value: 100, label: 'Test' };
    this.widget.updateData(testData);
    
    const renderedValue = this.widget.element.querySelector('.metric-value');
    expect(renderedValue.textContent).toContain('100');
  }

  testResponsiveBehavior() {
    const originalSize = { ...this.widget.size };
    this.widget.resize({ width: 6, height: 4 });
    
    expect(this.widget.size.width).toBe(6);
    expect(this.widget.size.height).toBe(4);
  }
}
```

### Performance Testing
```javascript
class DashboardPerformanceTest {
  constructor(dashboard) {
    this.dashboard = dashboard;
  }

  testRenderPerformance() {
    const startTime = performance.now();
    this.dashboard.render();
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(100); // 100ms threshold
  }

  testDataUpdatePerformance() {
    const largeDataset = this.generateLargeDataset(10000);
    const startTime = performance.now();
    this.dashboard.updateData(largeDataset);
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(50); // 50ms threshold
  }
}
```

## Best Practices

### Widget Design
- Keep widgets focused on single responsibility
- Implement consistent error handling
- Provide loading states for all async operations
- Use semantic HTML for accessibility
- Implement keyboard navigation

### Performance
- Use virtual scrolling for large datasets
- Implement proper caching strategies
- Optimize re-renders with React.memo or similar
- Use Web Workers for heavy computations
- Implement progressive loading

### Accessibility
- Provide ARIA labels for all interactive elements
- Ensure proper color contrast ratios
- Support screen readers with proper markup
- Implement keyboard navigation
- Provide alternative text for charts and graphs

### Security
- Validate all user inputs
- Sanitize data before rendering
- Implement proper authentication and authorization
- Use HTTPS for all data transmission
- Regular security audits and updates 