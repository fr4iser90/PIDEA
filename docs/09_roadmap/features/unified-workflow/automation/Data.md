Ich schaue mir das Unified Workflow System an und erkläre dir, wie es funktioniert.

Ran tool
Ran tool
Ran tool
Basierend auf meiner Analyse des Unified Workflow Systems kann ich dir eine kurze und knappe Erklärung geben:

## Unified Workflow System - Kurze Erklärung

Das **Unified Workflow System** ist eine umfassende Workflow-Engine für PIDEA, die verschiedene Automatisierungslevel und Workflow-Typen unterstützt.

### Kernkomponenten:

1. **Automation Level System** (5 Level):
   - `manual` - Vollständige manuelle Kontrolle
   - `assisted` - AI-Assistenz mit Bestätigung
   - `semi_auto` - AI-Ausführung mit Überwachung
   - `full_auto` - Vollständige Automatisierung
   - `adaptive` - Dynamische Level basierend auf Kontext

2. **Workflow Steps** für verschiedene Tasks:
   - `AnalysisStep` - Code-Analyse
   - `RefactoringStep` - Code-Refactoring
   - `DocumentationStep` - Dokumentation
   - `TestingStep` - Tests
   - `ValidationStep` - Validierung
   - `DeploymentStep` - Deployment

3. **Git Integration** mit automatischen:
   - Branch-Strategien
   - Pull Request Management
   - Auto-Review
   - Merge-Strategien

4. **Execution Engine** mit:
   - Optimierung
   - Resource Management
   - Caching
   - Monitoring

## Mermaid Diagramme

### 1. Gesamtarchitektur

```mermaid
graph TB
    subgraph "Unified Workflow System"
        A[Task Input] --> B[AutomationManager]
        B --> C{Automation Level}
        
        C -->|manual| D[Manual Workflow]
        C -->|assisted| E[Assisted Workflow]
        C -->|semi_auto| F[Semi-Auto Workflow]
        C -->|full_auto| G[Full-Auto Workflow]
        C -->|adaptive| H[Adaptive Workflow]
        
        D --> I[WorkflowBuilder]
        E --> I
        F --> I
        G --> I
        H --> I
        
        I --> J[ComposedWorkflow]
        J --> K[SequentialExecutionEngine]
        K --> L[GitWorkflowManager]
        L --> M[Result]
    end
```

### 2. Auto Refactor Workflow

```mermaid
graph LR
    subgraph "Auto Refactor Workflow"
        A[Refactor Task] --> B[AutomationManager]
        B --> C[RefactoringStep]
        
        C --> D{Refactoring Type}
        D -->|| E[ Refactoring]
        D -->|code-generation| F[Code Generation]
        D -->|feature-implementation| G[Feature Implementation]
        D -->|bug-fix| H[Bug Fix]
        D -->|optimization| I[Optimization]
        
        E --> J[Git Integration]
        F --> J
        G --> J
        H --> J
        I --> J
        
        J --> K[Branch Creation]
        K --> L[Code Changes]
        L --> M[Pull Request]
        M --> N[Auto Review]
        N --> O[Merge]
    end
```

### 3. Auto Docs Workflow

```mermaid
graph LR
    subgraph "Auto Docs Workflow"
        A[Documentation Task] --> B[AutomationManager]
        B --> C[DocumentationStep]
        
        C --> D{Documentation Type}
        D -->|generate-docs| E[Generate Documentation]
        D -->|generate-report| F[Generate Report]
        D -->|update-readme| G[Update README]
        D -->|generate-api-docs| H[Generate API Docs]
        D -->|validate-docs| I[Validate Documentation]
        
        E --> J[Git Integration]
        F --> J
        G --> J
        H --> J
        I --> J
        
        J --> K[Branch Creation]
        K --> L[Documentation Changes]
        L --> M[Pull Request]
        M --> N[Auto Review]
        N --> O[Merge]
    end
```

### 4. Auto Analysis Workflow

```mermaid
graph LR
    subgraph "Auto Analysis Workflow"
        A[Analysis Task] --> B[AutomationManager]
        B --> C[AnalysisStep]
        
        C --> D{Analysis Type}
        D -->|comprehensive| E[Comprehensive Analysis]
        D -->|architecture| F[Architecture Analysis]
        D -->|security| G[Security Analysis]
        D -->|performance| H[Performance Analysis]
        D -->|code-quality| I[Code Quality Analysis]
        
        E --> J[Analysis Results]
        F --> J
        G --> J
        H --> J
        I --> J
        
        J --> K[Report Generation]
        K --> L[DocumentationStep]
        L --> M[Git Integration]
        M --> N[Results Commit]
    end
```

### 5. Automation Level Decision Flow

```mermaid
graph TD
    A[Task Input] --> B{User Preference?}
    B -->|Yes| C[Use User Level]
    B -->|No| D{Project Setting?}
    
    D -->|Yes| E[Use Project Level]
    D -->|No| F{Task Type Level?}
    
    F -->|Yes| G[Use Task Type Level]
    F -->|No| H{AI Confidence >= 0.8?}
    
    H -->|Yes| I[Use Full Auto]
    H -->|No| J{Apply Rules?}
    
    J -->|Yes| K[Use Rule Level]
    J -->|No| L[Use Default: Semi-Auto]
    
    C --> M[Execute Workflow]
    E --> M
    G --> M
    I --> M
    K --> M
    L --> M
```

Das System ist sehr flexibel und kann automatisch zwischen verschiedenen Automatisierungsleveln wechseln, basierend auf Task-Typ, Benutzerpräferenzen, Projekt-Einstellungen und AI-Konfidenz.