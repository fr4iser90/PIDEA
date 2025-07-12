# Framework vs Workflow Relationship

## ❌ **Falsche Vorstellung:**
```
Workflow → Framework → Step
```

## ✅ **Korrekte Architektur:**
```
Workflow → Step → Framework
```

## 🔄 **Detaillierte Beziehung**

```mermaid
graph TB
    subgraph "Workflows (Ebene 1)"
        WF1[system_health_check.yaml]
        WF2[code_generation.yaml]
        WF3[deployment.yaml]
    end
    
    subgraph "Steps (Ebene 0)"
        S1[check_container_status]
        S2[check_gpu_usage]
        S3[generate_response]
        S4[apply_config]
        S5[run_tests]
        S6[deploy_container]
    end
    
    subgraph "Frameworks (Tools/Libraries)"
        F1[docker_engine]
        F2[monitor_agent]
        F3[ai_service]
        F4[config_manager]
        F5[test_runner]
        F6[deployment_service]
    end
    
    %% Workflows verwenden Steps
    WF1 --> S1
    WF1 --> S2
    WF2 --> S3
    WF2 --> S4
    WF3 --> S5
    WF3 --> S6
    
    %% Steps nutzen Frameworks
    S1 --> F1
    S2 --> F2
    S3 --> F3
    S4 --> F4
    S5 --> F5
    S6 --> F6
```

## 📁 **Struktur in der Praxis**

```
automation-platform/
├── workflows/                    # Definiert ABLÄUFE
│   ├── analyze/
│   │   └── system_health.yaml   # Workflow-Definition
│   └── deploy/
│       └── app_stack.yaml       # Workflow-Definition
├── steps/                       # Einzelne Aktionen
│   ├── check_container_status.py
│   ├── check_gpu_usage.py
│   ├── generate_response.py
│   └── apply_config.py
└── frameworks/                  # Werkzeugkästen
    ├── docker_engine/
    │   └── container_manager.py
    ├── monitor_agent/
    │   └── system_monitor.py
    ├── ai_service/
    │   └── llm_client.py
    └── config_manager/
        └── config_handler.py
```

## 🔧 **Konkrete Beispiele**

### 1. Workflow Definition (`system_health.yaml`)
```yaml
name: system_health_check
category: analyze
steps:
  - check_container_status
  - check_gpu_usage
  - log_results
```

### 2. Step Implementation (`check_container_status.py`)
```python
from frameworks.docker_engine.container_manager import ContainerManager

def check_container_status():
    # Step nutzt Framework
    container_manager = ContainerManager()
    status = container_manager.get_status("my-app")
    return {"status": status, "timestamp": datetime.now()}
```

### 3. Framework Implementation (`container_manager.py`)
```python
class ContainerManager:
    def get_status(self, container_name):
        # Framework-Logik
        return subprocess.run(["docker", "ps", "-q", "-f", f"name={container_name}"])
```

## 🎯 **Warum diese Trennung?**

### **Workflows sind "dumm"**
- Definieren nur die Reihenfolge
- Wissen nicht, WIE etwas gemacht wird
- Sind wiederverwendbar

### **Steps sind "schlau"**
- Wissen, WELCHE Frameworks sie brauchen
- Führen konkrete Aktionen aus
- Sind wiederverwendbar

### **Frameworks sind "Werkzeuge"**
- Enthalten die eigentliche Logik
- Sind wiederverwendbar
- Können von verschiedenen Steps genutzt werden

## 🔄 **Wiederverwendbarkeit**

```mermaid
graph LR
    subgraph "Workflow A"
        WA[deploy_app.yaml]
    end
    
    subgraph "Workflow B"
        WB[health_check.yaml]
    end
    
    subgraph "Gemeinsame Steps"
        S1[check_container_status]
        S2[apply_config]
    end
    
    subgraph "Gemeinsame Frameworks"
        F1[docker_engine]
        F2[config_manager]
    end
    
    WA --> S1
    WA --> S2
    WB --> S1
    
    S1 --> F1
    S2 --> F2
```

## ✅ **Zusammenfassung**

1. **Workflows** = "Was soll gemacht werden?" (Reihenfolge)
2. **Steps** = "Wie wird es gemacht?" (Aktionen)
3. **Frameworks** = "Womit wird es gemacht?" (Werkzeuge)

**Du brauchst alle drei Ebenen:**
- Workflows für die Orchestrierung
- Steps für die Wiederverwendbarkeit
- Frameworks für die Modularität

Diese Trennung macht dein System maximal flexibel und skalierbar! 🚀 