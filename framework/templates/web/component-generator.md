# Web Component Generator Template

## Form Configuration

### Component Overview
- **Component Name**: [Input: PascalCase component name]
- **Framework**: [Dropdown: React, Vue, Angular, Svelte, Vanilla JavaScript]
- **Component Type**: [Dropdown: Functional Component, Class Component, Hook, Higher-Order Component, Custom Hook]
- **Purpose**: [Text Area: What the component does]
- **Complexity Level**: [Dropdown: Simple, Medium, Complex, Advanced]

### Props & State
- **Required Props**: [Text Area: Props that must be passed to component]
- **Optional Props**: [Text Area: Props with default values]
- **Internal State**: [Text Area: State managed within component]
- **Event Handlers**: [Text Area: Functions for user interactions]
- **Data Types**: [Text Area: TypeScript types or PropTypes]

### Styling & Layout
- **Styling Approach**: [Dropdown: CSS Modules, Styled Components, Tailwind CSS, CSS-in-JS, SCSS, Plain CSS]
- **Layout Type**: [Dropdown: Flexbox, Grid, Block, Inline, Absolute, Relative]
- **Responsive Design**: [Checkboxes: Mobile, Tablet, Desktop, Large Screens]
- **Theme Support**: [Dropdown: Light/Dark Mode, Custom Themes, No Theme]
- **Animation**: [Checkboxes: Hover Effects, Transitions, Keyframes, None]

### Functionality
- **User Interactions**: [Checkboxes: Click, Hover, Focus, Input, Submit, Drag/Drop, Scroll, Keyboard]
- **Data Fetching**: [Checkboxes: API Calls, Local Storage, Context, Props, None]
- **Form Handling**: [Checkboxes: Controlled Inputs, Validation, Submission, Reset]
- **Error Handling**: [Text Area: How errors are displayed and managed]
- **Loading States**: [Text Area: Loading indicators and states]

### Accessibility
- **ARIA Labels**: [Text Area: Accessibility attributes needed]
- **Keyboard Navigation**: [Checkboxes: Tab Navigation, Arrow Keys, Enter/Space, Escape]
- **Screen Reader**: [Text Area: Text descriptions for screen readers]
- **Focus Management**: [Text Area: How focus is handled]
- **Color Contrast**: [Dropdown: High Contrast, Standard, Custom]

### Performance
- **Optimization**: [Checkboxes: Memoization, Lazy Loading, Code Splitting, Bundle Optimization]
- **Rendering**: [Dropdown: Client-side, Server-side, Static, Hybrid]
- **Caching**: [Text Area: Data caching strategies]
- **Bundle Size**: [Text Area: Size considerations and optimizations]

### Testing
- **Test Framework**: [Dropdown: Jest, Vitest, Cypress, Playwright, Testing Library]
- **Test Coverage**: [Checkboxes: Unit Tests, Integration Tests, E2E Tests, Visual Tests]
- **Mocking**: [Text Area: What needs to be mocked in tests]

## Generated Prompt Template

```
Create a [COMPONENT_TYPE] component named [COMPONENT_NAME] using [FRAMEWORK].

**Component Overview:**
- Purpose: [PURPOSE]
- Complexity: [COMPLEXITY_LEVEL]

**Props & State:**
- Required Props: [REQUIRED_PROPS]
- Optional Props: [OPTIONAL_PROPS]
- Internal State: [INTERNAL_STATE]
- Event Handlers: [EVENT_HANDLERS]
- Data Types: [DATA_TYPES]

**Styling & Layout:**
- Styling: [STYLING_APPROACH]
- Layout: [LAYOUT_TYPE]
- Responsive: [RESPONSIVE_DESIGN]
- Theme: [THEME_SUPPORT]
- Animation: [ANIMATION]

**Functionality:**
- Interactions: [USER_INTERACTIONS]
- Data: [DATA_FETCHING]
- Forms: [FORM_HANDLING]
- Error Handling: [ERROR_HANDLING]
- Loading: [LOADING_STATES]

**Accessibility:**
- ARIA: [ARIA_LABELS]
- Keyboard: [KEYBOARD_NAVIGATION]
- Screen Reader: [SCREEN_READER]
- Focus: [FOCUS_MANAGEMENT]
- Contrast: [COLOR_CONTRAST]

**Performance:**
- Optimization: [OPTIMIZATION]
- Rendering: [RENDERING]
- Caching: [CACHING]
- Bundle: [BUNDLE_SIZE]

**Testing:**
- Framework: [TEST_FRAMEWORK]
- Coverage: [TEST_COVERAGE]
- Mocking: [MOCKING]

Please provide:
1. Complete component code with proper structure
2. TypeScript types or PropTypes
3. Styling implementation
4. Accessibility features
5. Error handling and edge cases
6. Performance optimizations
7. Unit test examples
8. Usage examples and documentation
```

## Usage Instructions

1. Complete all relevant form fields
2. Generate formatted component prompt
3. Submit to AI for component generation
4. Review and customize the generated code
5. Add to your project and test thoroughly 