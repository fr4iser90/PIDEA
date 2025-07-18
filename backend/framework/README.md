# Framework System - Step-Based Architecture

## 🎯 **Framework-Typen (Alle Step-basiert)**

### **1. Normal Workflow (Sequentiell)**
```
Framework: DDD Refactoring
├── Step 1: ANALYZE_PROJECT_STRUCTURE (Script Step)
├── Step 2: AI_SEND_ANALYSIS_PROMPT (AI Step)
├── Step 3: AI_GET_ANALYSIS_RESPONSE (AI Step)
├── Step 4: GENERATE_REFACTORING_PLAN (Script Step)
├── Step 5: AI_SEND_PLAN_PROMPT (AI Step)
├── Step 6: AI_GET_PLAN_RESPONSE (AI Step)
├── Step 7: APPLY_REFACTORING_CHANGES (Script Step)
└── Step 8: VALIDATE_CHANGES (Script Step)
```

### **2. Single Shot (Einmalig)**
```
Framework: Code Documentation
├── Step 1: ANALYZE_CODE_FILES (Script Step)
├── Step 2: AI_SEND_DOCUMENTATION_PROMPT (AI Step)
└── Step 3: AI_GET_DOCUMENTATION_RESPONSE (AI Step)
```

### **3. Iterative (Aufeinander aufbauend)**
```
Framework: AI Code Review
├── Step 1: ANALYZE_CODE (Script Step)
├── Step 2: AI_SEND_PROMPT (AI Step) 
├── Step 3: AI_GET_RESPONSE (AI Step)
├── Step 4: PROCESS_AI_RESPONSE (Script Step)
├── Step 5: BUILD_NEW_PROMPT (Script Step)
├── Step 6: AI_SEND_REFINED_PROMPT (AI Step)
├── Step 7: AI_GET_REFINED_RESPONSE (AI Step)
├── Step 8: PROCESS_FINAL_RESPONSE (Script Step)
└── Step 9: GENERATE_FINAL_RESULT (Script Step)
```

### **4. Git Workflow (Mit Git Management)**
```
Framework: Task Branch Workflow
├── Step 1: ANALYZE_TASK (Script Step)
├── Step 2: GIT_CREATE_BRANCH (Git Step)
├── Step 3: AI_SEND_TASK_PROMPT (AI Step)
├── Step 4: AI_GET_TASK_RESPONSE (AI Step)
├── Step 5: APPLY_CHANGES (Script Step)
├── Step 6: GIT_COMMIT (Git Step)
├── Step 7: GIT_PUSH (Git Step)
└── Step 8: CREATE_PULL_REQUEST (Git Step)
```

### **5. Autonomous AI Workflow (Vollautomatisch)**
```
Framework: AI Autonomous Development
├── Step 1: ANALYZE_PROJECT (Script Step)
├── Step 2: AI_SEND_ANALYSIS_PROMPT (AI Step)
├── Step 3: AI_GET_ANALYSIS_RESPONSE (AI Step)
├── Step 4: GIT_CREATE_FEATURE_BRANCH (Git Step)
├── Step 5: AI_GENERATE_IMPLEMENTATION (AI Step)
├── Step 6: AI_APPLY_CHANGES (AI Step)
├── Step 7: AI_RUN_TESTS (AI Step)
├── Step 8: AI_FIX_ISSUES (AI Step)
├── Step 9: GIT_COMMIT_CHANGES (Git Step)
├── Step 10: GIT_PUSH_BRANCH (Git Step)
├── Step 11: AI_CREATE_PULL_REQUEST (AI Step)
└── Step 12: AI_MERGE_IF_APPROVED (AI Step)
```

### **6. Custom Steps (Erweiterbar)**
```
Framework: Testing Framework
├── Step 1: GENERATE_TESTS (Script Step)
├── Step 2: [CUSTOM: user_defined_step] (Custom Step)
├── Step 3: RUN_TESTS (Script Step)
└── Step 4: [CUSTOM: user_defined_step] (Custom Step)
```

## 🔧 **Step-Typen**

### **AI Steps:**
- **AI_SEND_PROMPT:** Sendet Prompt an AI
- **AI_GET_RESPONSE:** Holt Response von AI

### **Script Steps:**
- **ANALYZE_*:** Analysiert Code/Projekt
- **PROCESS_*:** Verarbeitet Daten
- **BUILD_*:** Erstellt neue Prompts/Data
- **GENERATE_*:** Generiert Output
- **APPLY_*:** Wendet Changes an
- **VALIDATE_*:** Validiert Results

### **Git Steps:**
- **GIT_CREATE_BRANCH:** Erstellt neuen Branch
- **GIT_COMMIT:** Committet Changes
- **GIT_PUSH:** Pusht Changes
- **GIT_PULL:** Pullt Changes
- **GIT_MERGE:** Merged Branches
- **GIT_CHECKOUT:** Wechselt Branch
- **GIT_CREATE_PULL_REQUEST:** Erstellt Pull Request
- **GIT_MERGE_PULL_REQUEST:** Merged Pull Request

### **Template Steps:**
- **TEMPLATE_APPLY:** Wendet Template an
- **TEMPLATE_GENERATE:** Generiert aus Template

### **Custom Steps:**
- **CUSTOM_*:** User-definierte Steps

## 📋 **Alle Steps (Aktuell + Fehlend)**

### **Aktuelle Steps (bereits implementiert):**
- **analysis_step.js** - Hauptanalyse-Step
- **check_container_status.js** - Container-Status prüfen
- **refactor_analyze.js** - Refactoring-Analyse
- **refactor_generate_task.js** - Refactoring-Tasks generieren
- **refactor_step.js** - Hauptrefactoring-Step
- **run_unit_tests.js** - Unit Tests ausführen
- **testing_step.js** - Haupttesting-Step
- **chat** - Chat-basierte Steps
- **terminal** - Terminal-Commands
- **analysis** - Analyse-Steps
- **ide** - IDE-Integration
- **GIT_COMMIT, GIT_PUSH, GIT_PULL, GIT_CREATE_BRANCH, GIT_MERGE, GIT_CHECKOUT**
- **openTerminal, executeCommand, monitorOutput**

### **Fehlende Steps (noch zu implementieren):**

#### **IDE Steps:**
- **IDE_OPEN_FILE** - Datei in IDE öffnen
- **IDE_EDIT_FILE** - Datei bearbeiten
- **IDE_CREATE_FILE** - Neue Datei erstellen
- **IDE_DELETE_FILE** - Datei löschen
- **IDE_RENAME_FILE** - Datei umbenennen
- **IDE_MOVE_FILE** - Datei verschieben
- **IDE_SEARCH_CODE** - Code durchsuchen
- **IDE_GET_FILE_CONTENT** - Datei-Inhalt holen
- **IDE_SAVE_FILE** - Datei speichern
- **IDE_GET_PROJECT_STRUCTURE** - Projekt-Struktur holen
- **IDE_GET_ACTIVE_FILE** - Aktive Datei holen
- **IDE_GET_CURSOR_POSITION** - Cursor-Position holen

#### **Cursor AI Steps:**
- **CURSOR_SEND_MESSAGE** - Nachricht an Cursor AI senden
- **CURSOR_GET_RESPONSE** - Response von Cursor AI holen
- **CURSOR_EXECUTE_COMMAND** - Cursor Command ausführen
- **CURSOR_APPLY_CHANGES** - AI-Änderungen anwenden
- **CURSOR_ANALYZE_CODE** - Code mit Cursor analysieren
- **CURSOR_GENERATE_CODE** - Code mit Cursor generieren
- **CURSOR_REFACTOR_CODE** - Code mit Cursor refactoren
- **CURSOR_FIX_CODE** - Code mit Cursor reparieren
- **CURSOR_EXPLAIN_CODE** - Code mit Cursor erklären
- **CURSOR_OPTIMIZE_CODE** - Code mit Cursor optimieren

#### **Template Steps:**
- **TEMPLATE_APPLY** - Template anwenden
- **TEMPLATE_GENERATE** - Aus Template generieren
- **TEMPLATE_VALIDATE** - Template validieren
- **TEMPLATE_CUSTOMIZE** - Template anpassen

#### **Script Steps:**
- **SCRIPT_EXECUTE** - Script ausführen
- **SCRIPT_VALIDATE** - Script validieren
- **SCRIPT_BUILD** - Script bauen
- **SCRIPT_TEST** - Script testen

#### **Data Processing Steps:**
- **PROCESS_AI_RESPONSE** - AI Response verarbeiten
- **BUILD_NEW_PROMPT** - Neuen Prompt erstellen
- **EXTRACT_CODE_BLOCKS** - Code-Blöcke extrahieren
- **PARSE_JSON_RESPONSE** - JSON Response parsen
- **VALIDATE_DATA** - Daten validieren
- **TRANSFORM_DATA** - Daten transformieren

#### **File System Steps:**
- **FILE_READ** - Datei lesen
- **FILE_WRITE** - Datei schreiben
- **FILE_COPY** - Datei kopieren
- **FILE_MOVE** - Datei verschieben
- **FILE_DELETE** - Datei löschen
- **FILE_SEARCH** - Dateien suchen
- **FILE_VALIDATE** - Datei validieren

#### **Project Steps:**
- **PROJECT_ANALYZE_STRUCTURE** - Projekt-Struktur analysieren
- **PROJECT_GET_DEPENDENCIES** - Dependencies holen
- **PROJECT_VALIDATE_SETUP** - Projekt-Setup validieren
- **PROJECT_BUILD** - Projekt bauen
- **PROJECT_TEST** - Projekt testen
- **PROJECT_DEPLOY** - Projekt deployen

#### **Custom Steps:**
- **CUSTOM_USER_DEFINED** - User-definierter Step
- **CUSTOM_VALIDATION** - Custom Validierung
- **CUSTOM_TRANSFORMATION** - Custom Transformation

## 📋 **Framework Loading Process**

1. **Load Framework Config:** JSON-Konfiguration laden
2. **Load Steps:** Alle Steps aus Framework-Ordner laden
3. **Load Resources:** Prompts, Scripts, Templates laden
4. **Apply to Project:** Framework auf spezifisches Projekt anwenden
5. **Execute Workflow:** Steps sequentiell ausführen

## 🎯 **Ziel**

Jedes Framework ist eine Sammlung von Steps, die automatisch geladen und auf Projekte angewendet werden können. Keine hardcodierten Workflows mehr!