# Database Analysis Tables Cleanup - Implementation Plan (Direct Init Edit)

## 1. Project Overview
- **Feature/Component Name**: Database Analysis Tables Cleanup (Direct Init Edit)
- **Priority**: High
- **Category**: migration
- **Estimated Time**: 2 hours
- **Dependencies**: None (neue Datenbank wird frisch erstellt)
- **Related Issues**: Redundant analysis tables causing confusion

### 2. Technical Requirements
- **Tech Stack**: PostgreSQL/SQLite, Node.js
- **Architecture Pattern**: Database-first
- **Database Changes**: 
  - Entferne alle Migrationen und Datenübernahmen
  - Passe nur die Init-Dateien an:
    - **Nur noch eine Tabelle:** `analysis` (basiert auf `analysis_steps`)
    - **Entferne alle anderen Analysis-Tabellen komplett**
    - **KEINE** `task_suggestions` Tabelle mehr! Recommendations sind im `analysis.result` JSON enthalten.
    - Passe alle Foreign Keys und Referenzen in Init-SQL an
- **API Changes**: Update alle Endpunkte, die bisher auf andere Tabellen zugreifen
- **Backend Changes**: Repositories, Services, Entities auf neue Struktur anpassen
- **Frontend Changes**: API-Calls und Anzeige ggf. anpassen

### 3. File Impact Analysis

#### Files to Modify:
- [ ] `database/init-postgres.sql` - Nur noch Tabelle `analysis` (basiert auf `analysis_steps`), **alle anderen Analysis-Tabellen entfernen**
- [ ] `database/init-sqlite.sql` - Nur noch Tabelle `analysis` (basiert auf `analysis_steps`), **alle anderen Analysis-Tabellen entfernen**
- [ ] `backend/domain/entities/Analysis.js` - Neue Entity für die einheitliche Tabelle
- [ ] `backend/infrastructure/database/AnalysisRepository.js` - Repository für neue Tabelle
- [ ] `backend/application/services/AnalysisApplicationService.js` - Service auf neue Struktur anpassen
- [ ] `backend/presentation/api/AnalysisController.js` - Endpunkte auf neue Struktur anpassen
- [ ] `frontend/src/infrastructure/repositories/APIChatRepository.jsx` - API-Calls ggf. anpassen

#### Files to Delete:
- [ ] `backend/domain/entities/AnalysisResult.js` - Entfernen
- [ ] `backend/domain/entities/ProjectAnalysis.js` - Entfernen
- [ ] `backend/infrastructure/database/SQLiteProjectAnalysisRepository.js` - Entfernen
- [ ] `backend/infrastructure/database/PostgreSQLProjectAnalysisRepository.js` - Entfernen
- [ ] `backend/infrastructure/database/SQLiteAnalysisRepository.js` - Entfernen (alte Version, falls noch vorhanden)
- [ ] `backend/infrastructure/database/InMemoryAnalysisRepository.js` - Entfernen (alte Version, falls noch vorhanden)
- [ ] `backend/domain/repositories/AnalysisResultRepository.js` - Entfernen (falls existiert)
- [ ] `backend/domain/repositories/ProjectAnalysisRepository.js` - Entfernen
- [ ] `backend/domain/repositories/TaskSuggestionRepository.js` - **Entfernen!**
- [ ] `backend/infrastructure/database/SQLiteTaskSuggestionRepository.js` - **Entfernen!**
- [ ] `backend/infrastructure/database/PostgreSQLTaskSuggestionRepository.js` - **Entfernen!**

### 4. Repository Impact Analysis

#### ❌ **Repository-Dateien die ENTFERNT werden:**

**AnalysisResult-bezogene Repositories:**
- `backend/infrastructure/database/SQLiteAnalysisRepository.js` → Entfernen, falls noch alte Version vorhanden
- `backend/infrastructure/database/InMemoryAnalysisRepository.js` → Entfernen

**ProjectAnalysis-bezogene Repositories:**
- `backend/domain/repositories/ProjectAnalysisRepository.js` → Entfernen
- `backend/infrastructure/database/SQLiteProjectAnalysisRepository.js` → Entfernen
- `backend/infrastructure/database/PostgreSQLProjectAnalysisRepository.js` → Entfernen

**TaskSuggestion-bezogene Repositories:**
- `backend/domain/repositories/TaskSuggestionRepository.js` → **Entfernen!**
- `backend/infrastructure/database/SQLiteTaskSuggestionRepository.js` → **Entfernen!**
- `backend/infrastructure/database/PostgreSQLTaskSuggestionRepository.js` → **Entfernen!**

#### ✅ **Repository-Dateien die BLEIBEN:**

**Analysis-bezogene Repositories (werden angepasst):**
- `backend/domain/repositories/AnalysisRepository.js` → Interface für neue `analysis` Tabelle (ANPASSEN)
- `backend/domain/repositories/AnalysisStepRepository.js` → Wird zu `AnalysisRepository.js` (UMBENENNEN)

**Andere Repositories (bleiben unverändert):**
- `backend/domain/repositories/TaskRepository.js` → Task-Management
- `backend/domain/repositories/ChatRepository.js` → Chat-System
- `backend/domain/repositories/UserRepository.js` → User-Management
- `backend/domain/repositories/UserSessionRepository.js` → Session-Management
- `backend/domain/repositories/TaskExecutionRepository.js` → Task-Ausführung
- `backend/domain/repositories/TaskTemplateRepository.js` → Task-Templates
- `backend/domain/repositories/TestMetadataRepository.js` → Test-Metadaten

#### 🔄 **Repository-Dateien die ANGEPASST werden:**

**ServiceRegistry Anpassungen:**
- `backend/infrastructure/dependency-injection/ServiceRegistry.js` → Entferne Registrierungen für:
  - `projectAnalysisRepository`
  - `taskSuggestionRepository`
  - `analysisRepository` (alte Version)
  - Füge neue `analysisRepository` Registrierung hinzu

### 5. Frontend Impact Analysis

#### ❌ **Frontend-Komponenten die ENTFERNT werden:**

**Recommendation-spezifische Komponenten:**
- [ ] `frontend/src/components/RecommendationStep.jsx` - Entfernen
- [ ] `frontend/src/components/RecommendationList.jsx` - Entfernen
- [ ] `frontend/src/components/RecommendationCard.jsx` - Entfernen
- [ ] `frontend/src/components/RecommendationWorkflow.jsx` - Entfernen
- [ ] `frontend/src/hooks/useRecommendations.js` - Entfernen
- [ ] `frontend/src/services/RecommendationService.js` - Entfernen

**Recommendation-spezifische Buttons/Actions:**
- [ ] "Generate Recommendations" Button → Recommendations sind automatisch in Analysen
- [ ] "View Recommendations" Button → Recommendations sind in Analysis-Results
- [ ] "Recommendation Workflow" Button → Kein separater Workflow nötig

#### ✅ **Frontend-Komponenten die BLEIBEN/ANGEPASST werden:**

**Analysis-Komponenten (werden angepasst):**
- [ ] `frontend/src/components/AnalysisStep.jsx` → Zeigt Recommendations aus `analysis.result`
- [ ] `frontend/src/components/AnalysisResults.jsx` → Zeigt Recommendations aus `analysis.result`
- [ ] `frontend/src/components/AnalysisWorkflow.jsx` → Generiert automatisch Recommendations

**Task-Erstellung (wird angepasst):**
- [ ] `frontend/src/components/TaskCreation.jsx` → Erstellt Tasks direkt aus `analysis.result.recommendations`
- [ ] `frontend/src/hooks/useTaskCreation.js` → Nutzt Recommendations aus Analysis-Results

#### 🔄 **Frontend-Anpassungen:**

**API-Calls anpassen:**
- [ ] Entferne separate Recommendation-API-Calls
- [ ] Nutze nur Analysis-API-Calls (Recommendations sind bereits drin)
- [ ] Passe Task-Erstellung an: `analysis.result.recommendations` → Tasks

**UI-Flow vereinfachen:**
- [ ] Analysis-Step → Zeigt automatisch Recommendations
- [ ] Task-Erstellung direkt aus Analysis-Results
- [ ] Keine separaten Recommendation-Schritte mehr

### 6. Implementation Phases

#### Phase 1: Init-Dateien anpassen (1 Stunde)
- [ ] Passe `init-postgres.sql` und `init-sqlite.sql` an: **Nur noch Tabelle `analysis` (basiert auf `analysis_steps`), alle anderen Analysis-Tabellen entfernen**

#### Phase 2: Backend/Frontend Code anpassen (1 Stunde)
- [ ] Entities, Repositories, Services, Controller, API-Calls auf neue Struktur anpassen
- [ ] Frontend-Komponenten anpassen: Recommendations aus Analysis-Results
- [ ] Tests und Dokumentation aktualisieren

### 7. Code Standards & Patterns
- **Coding Style**: Projektstandard
- **Naming Conventions**: Einheitlich `analysis`
- **Error Handling**: Wie bisher
- **Logging**: Wie bisher
- **Testing**: Unit/Integration-Tests anpassen
- **Documentation**: Dokumentation aktualisieren

### 8. Security Considerations
- [ ] Keine Migration nötig, da frische Datenbank
- [ ] Init-Dateien sauber versionieren

### 9. Performance Requirements
- **Query Performance**: Wie bisher oder besser
- **Storage**: Keine Redundanz mehr

### 10. Testing Strategy
- [ ] Teste neue Datenbankanlage mit Init-SQL
- [ ] Teste alle Analyse-Funktionen im Backend/Frontend

### 11. Documentation Requirements
- [ ] Dokumentiere neue Struktur in README und API-Doku

### 12. Deployment Checklist
- [ ] Init-Dateien bereitstellen
- [ ] Backend/Frontend Code aktualisieren
- [ ] Tests ausführen

---

## WICHTIG: Recommendations/Task Suggestions
- **KEINE** separate Tabelle `task_suggestions` mehr!
- **KEINE** TaskSuggestion-Entity oder -Repository mehr!
- **Recommendations** sind **nur noch** ein Feld im `analysis.result` JSON der `analysis`-Tabelle.
- **Alle alten Suggestion-Komponenten/Repos/Entities entfernen!**

---

## Neue Init-SQL Struktur (Finale Version)
```sql
CREATE TABLE IF NOT EXISTS analysis (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    project_id TEXT NOT NULL,
    analysis_type TEXT NOT NULL, -- 'security', 'code-quality', 'performance', 'architecture', 'layer-violations'
    status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
    progress INTEGER DEFAULT 0,
    started_at TEXT,
    completed_at TEXT,
    error TEXT, -- JSON error information
    result TEXT, -- JSON analysis result data (INCLUDES recommendations!)
    metadata TEXT, -- JSON additional metadata
    config TEXT, -- JSON step configuration
    timeout INTEGER DEFAULT 300000,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 2,
    memory_usage INTEGER, -- Memory usage in bytes
    execution_time INTEGER, -- Execution time in milliseconds
    file_count INTEGER, -- Number of files processed
    line_count INTEGER, -- Number of lines processed
    overall_score REAL, -- 0-100 score
    critical_issues_count INTEGER DEFAULT 0,
    warnings_count INTEGER DEFAULT 0,
    recommendations_count INTEGER DEFAULT 0, -- Quick count
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects (id)
);
```

---

## Vorteile
- **Kein Migrationsaufwand**: Einfach neue Datenbank anlegen, fertig
- **Keine Redundanz**: Nur noch eine Tabelle für alle Analysen
- **Wartungsarm**: Weniger Code, weniger Fehlerquellen
- **Klarheit**: Alle Analysen einheitlich, einfach abfragbar
- **Recommendations integriert**: Direkt im `result` JSON, keine separate Tabelle
- **Frontend vereinfacht**: Keine separaten Recommendation-Komponenten nötig

---

**Hinweis:**
- Wer bestehende Daten migrieren will, muss das manuell tun (nicht Teil dieses Plans)
- Für neue Setups reicht das Anpassen der Init-Dateien und des Codes 