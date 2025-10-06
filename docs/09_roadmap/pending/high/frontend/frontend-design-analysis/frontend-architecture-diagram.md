# Frontend Architecture Diagram

## Component Hierarchy Diagram

```mermaid
graph TD
    A[App.jsx] --> B[AuthWrapper]
    B --> C[IDEProvider]
    C --> D[Header]
    C --> E[Main Layout]
    C --> F[Footer]
    C --> G[NotificationSystem]
    C --> H[SessionWarningModal]
    
    E --> I[SidebarLeft]
    E --> J[Main Content]
    E --> K[SidebarRight]
    
    J --> L[ChatComponent]
    J --> M[IDEMirrorComponent]
    J --> N[PreviewComponent]
    J --> O[AnalysisDataViewer]
    J --> P[GitManagementComponent]
    J --> Q[TestRunnerComponent]
    
    I --> R[ChatPanelComponent]
    I --> S[IDEStartModal]
    
    K --> T[TasksPanelComponent]
    K --> U[QueueManagementPanel]
    K --> V[AutoPanelComponent]
    K --> W[FrameworksPanelComponent]
    K --> X[PromptsPanelComponent]
    K --> Y[TemplatesPanelComponent]
    K --> Z[AnalysisPanelComponent]
```

## Layout Structure Diagram

```mermaid
graph LR
    A[App Root] --> B[Header - 65px]
    A --> C[Main Layout Container]
    A --> D[Footer]
    
    C --> E[Left Sidebar - 280px]
    C --> F[Main Content - flex: 1]
    C --> G[Right Sidebar - 320px]
    
    F --> H[Current View]
    F --> I[Split View Preview]
    
    E --> J[IDE Management]
    E --> K[Chat Sessions]
    
    G --> L[Tasks]
    G --> M[Queue]
    G --> N[Auto]
    G --> O[Frameworks]
    G --> P[Prompts]
    G --> Q[Templates]
    G --> R[Analysis]
    G --> S[Settings]
```

## State Management Flow

```mermaid
graph TD
    A[User Action] --> B[EventBus]
    B --> C[Component Handler]
    C --> D[Store Update]
    D --> E[State Change]
    E --> F[UI Re-render]
    
    G[AuthStore] --> H[Authentication State]
    I[IDEStore] --> J[IDE Connection State]
    K[EventBus] --> L[Component Communication]
```

## CSS Architecture Diagram

```mermaid
graph TD
    A[main.css - Design System] --> B[CSS Variables]
    A --> C[Layout System]
    A --> D[Typography]
    A --> E[Color Palette]
    
    F[Component CSS Files] --> G[chat-component.css]
    F --> H[panel-block.css]
    F --> I[login.css]
    F --> J[sidebar-left.css]
    F --> K[sidebar-right.css]
    
    L[View-Specific CSS] --> M[chat.css]
    L --> N[mirror.css]
    L --> O[analysis-metrics.css]
    L --> P[test-runner.css]
```

## Design Token System

```mermaid
graph LR
    A[Design Tokens] --> B[Colors]
    A --> C[Spacing]
    A --> D[Typography]
    A --> E[Shadows]
    A --> F[Border Radius]
    
    B --> G[Primary Colors]
    B --> H[Accent Colors]
    B --> I[Background Colors]
    
    C --> J[Padding Values]
    C --> K[Margin Values]
    C --> L[Layout Dimensions]
    
    D --> M[Font Families]
    D --> N[Font Sizes]
    D --> O[Font Weights]
    D --> P[Line Heights]
```

## Responsive Design Strategy

```mermaid
graph TD
    A[Responsive Design] --> B[Mobile < 768px]
    A --> C[Tablet 768px-1024px]
    A --> D[Desktop > 1024px]
    
    B --> E[Sidebar Collapse]
    B --> F[Touch-Friendly UI]
    B --> G[Mobile Navigation]
    
    C --> H[Adaptive Layout]
    C --> I[Flexible Sidebars]
    
    D --> J[Full Layout]
    D --> K[Multi-Panel View]
    D --> L[Split View Support]
```