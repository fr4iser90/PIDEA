# 🖥️ UI-Streaming-Tools Integration - TODO

## 🎯 Aktuelle Situation
- Cursor-IDE (VSCode-basierte Desktop-App) wird über Screenshots gestreamt
- Eingaben erfolgen über CDP/Playwright Automatisierung
- Benötigt: Web-basiertes Anzeigen des IDE-Fensters

## 🔍 Analysierte Lösungen (aus PDF)

### 1. **Xpra** (Xpra.org)
**Status:** ✅ Empfohlen für X11
- **Vorteile:** Portabel, vollwertiges "Detach", gute Bandbreiten-Verwaltung
- **Nachteile:** Performance bei 3D/Videografik, Wayland nicht nativ
- **Implementierung:** Headless mit Xvfb, CLI-steuerbar

### 2. **Sunshine/Moonlight** (LizardByte)
**Status:** 🔥 Maximale Performance
- **Vorteile:** Extrem niedrige Latenz, GPU-beschleunigt (H.264/H.265)
- **Nachteile:** Erfordert moderne GPU, primär für Spiele, kein HTML5-Client
- **Implementierung:** Hardware-Encoder (NVENC, QuickSync, VCE)

### 3. **WebRTC-Streamer** (mpromonet)
**Status:** ⭐ Beste Option für Browser
- **Vorteile:** Reines WebRTC, screen:// oder window:// Capture, direkt im Server
- **Nachteile:** Experimentell, nur Videodaten (keine Eingabe)
- **Implementierung:** Perfekt für View-Only + CDP-Automatisierung

### 4. **Neko** (WebRTC-Container)
**Status:** 🐳 Container-Lösung
- **Vorteile:** Komplett-Desktop in Container, Multi-User-WebRTC
- **Nachteile:** Experimentell, weniger dokumentiert
- **Implementierung:** Docker-basiert

### 5. **xRDP/RDP**
**Status:** 🔧 Ausgereift aber komplex
- **Vorteile:** Sehr performant, weit verbreitet
- **Nachteile:** Kein HTML5-Client, komplexe Einrichtung
- **Implementierung:** Benötigt Guacamole für Web-Interface

## 🚀 Implementierungs-Plan

### Phase 1: WebRTC-Streamer Integration (Priorität 1)
```bash
# TODO: Direkte Server-Integration
npm install webrtc-streamer
# oder
sudo apt install webrtc-streamer

# Direkt im Server starten
webrtc-streamer -s screen:// -p 8000
```

**Aufgaben:**
- [ ] **WebRTC-Streamer Setup**: Direkt im Server installieren und starten
- [ ] **Browser-Integration**: WebRTC-Client in der Web-App
- [ ] **CDP-Bridge**: Automatisierung parallel zum Stream
- [ ] **Fallback-System**: Screenshot-Modus als Backup

### Phase 2: Xpra Integration (Priorität 2)
```bash
# TODO: Xpra Server Setup
xpra start --bind-tcp=0.0.0.0:10000 --html=on --daemon=no
```

**Aufgaben:**
- [ ] **Xpra Server**: Headless X11-Server mit Cursor-IDE
- [ ] **HTML5-Client**: Browser-basierter Xpra-Client
- [ ] **Session-Management**: Persistente IDE-Sessions
- [ ] **Performance-Optimierung**: Bandbreiten-Management

### Phase 3: Sunshine Integration (Priorität 3)
```bash
# TODO: Sunshine Server Setup
sunshine --config /etc/sunshine/sunshine.conf
```

**Aufgaben:**
- [ ] **GPU-Support**: Hardware-Encoder Konfiguration
- [ ] **Moonlight-Client**: Web-basierter Moonlight-Client
- [ ] **Low-Latency**: Optimierung für minimale Latenz
- [ ] **Quality-Settings**: H.264/H.265 Streaming

## 🔧 Technische Integration

### WebRTC-Streamer Integration
```javascript
// TODO: Direkte Server-Integration (src/domain/services/IDEMirrorService.js)
const { spawn } = require('child_process');

class IDEMirrorService {
  constructor() {
    this.webrtcStreamer = null;
  }
  
  async startWebRTCStream() {
    // WebRTC-Streamer als Child Process starten
    this.webrtcStreamer = spawn('webrtc-streamer', [
      '-s', 'screen://',
      '-p', '8000',
      '--verbose'
    ]);
  }
  
  async getWebRTCStream() {
    // Statt Screenshot: WebRTC-Stream URL zurückgeben
    return 'ws://localhost:8000/webrtc';
  }
}
```

### Xpra Integration
```javascript
// TODO: xpra-client.js
class XpraClient {
  constructor() {
    this.websocket = null;
    this.canvas = null;
  }
  
  async connectToXpra(host, port) {
    // Xpra WebSocket-Verbindung
    // HTML5-Canvas Rendering
  }
}
```

### Sunshine Integration
```javascript
// TODO: moonlight-client.js
class MoonlightClient {
  constructor() {
    this.connection = null;
    this.decoder = null;
  }
  
  async connectToSunshine(host, port) {
    // Moonlight-Protokoll Implementation
    // Hardware-beschleunigte Dekodierung
  }
}
```

## 📊 Performance-Vergleich

| Lösung | Latenz | CPU-Last | GPU-Nutzung | Browser-Support |
|--------|--------|----------|-------------|-----------------|
| Screenshots | ~500ms | Hoch | Nein | ✅ |
| WebRTC-Streamer | ~50ms | Mittel | Nein | ✅ |
| Xpra | ~100ms | Mittel | Nein | ✅ |
| Sunshine | ~10ms | Niedrig | Hoch | ❌ |
| RDP | ~200ms | Niedrig | Nein | ⚠️ |

## 🎯 Empfohlene Implementierung

### 1. **Primäre Lösung: WebRTC-Streamer (Direkt im Server)**
```javascript
// Direkt im Server (src/domain/services/IDEMirrorService.js)
const { spawn } = require('child_process');

class IDEMirrorService {
  async startWebRTCStream() {
    this.webrtcStreamer = spawn('webrtc-streamer', [
      '-s', 'screen://',
      '-p', '8000',
      '--verbose'
    ]);
  }
}
```

### 2. **Fallback: Xpra (Direkt installiert)**
```bash
# Direkt installieren und starten
sudo apt install xpra
xpra start --bind-tcp=0.0.0.0:10000 --html=on --daemon=no
```

## 🔄 Migration-Plan

### Schritt 1: WebRTC-Streamer Test
- [ ] webrtc-streamer direkt im Server installieren (`npm install webrtc-streamer`)
- [ ] Browser-Client implementieren
- [ ] Performance-Tests durchführen
- [ ] CDP-Integration testen

### Schritt 2: Screenshot-Fallback entfernen
- [ ] WebRTC als primäre Lösung
- [ ] Screenshot-Modus deaktivieren
- [ ] Performance-Monitoring einrichten

### Schritt 3: Erweiterte Features
- [ ] Multi-User Support
- [ ] Session-Persistierung
- [ ] Quality-Adaptation
- [ ] Mobile Support

## 📝 Code-Änderungen

### `IDEMirrorService.js`
```javascript
// TODO: Direkte WebRTC-Integration
const { spawn } = require('child_process');

class IDEMirrorService {
  async startWebRTCStream() {
    // WebRTC-Streamer als Child Process starten
    this.webrtcStreamer = spawn('webrtc-streamer', [
      '-s', 'screen://',
      '-p', '8000',
      '--verbose'
    ]);
  }
  
  async captureViaWebRTC() {
    // Statt Screenshot: WebRTC-Stream URL
    return 'ws://localhost:8000/webrtc';
  }
}
```

### `IDEMirrorComponent.js`
```javascript
// TODO: WebRTC-Client Integration
class IDEMirrorComponent {
  async renderWebRTCStream() {
    // Statt Screenshot-Image: WebRTC-Video-Element
    const video = document.createElement('video');
    video.autoplay = true;
    video.controls = false;
    
    // WebRTC-Verbindung aufbauen
    const pc = new RTCPeerConnection();
    pc.ontrack = (event) => {
      video.srcObject = event.streams[0];
    };
    
    // Verbindung zum webrtc-streamer
    const response = await fetch('http://localhost:8000/api/call?peerid=1&url=screen://');
    const offer = await response.json();
    await pc.setRemoteDescription(offer);
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    this.container.appendChild(video);
  }
}
```

## 🎯 Erfolgs-Metriken

- **Latenz**: < 100ms (vs. 500ms Screenshots)
- **CPU-Last**: < 30% (vs. 80% Screenshots)
- **Bandbreite**: < 5Mbps (vs. 20Mbps Screenshots)
- **Browser-Support**: 100% (alle modernen Browser)
- **Fallback-Rate**: < 1% (WebRTC zu Screenshots)

## 🔗 Quellen (aus PDF)

- [Xpra](https://xpra.org/index.html)
- [Sunshine](https://github.com/LizardByte/Sunshine)
- [WebRTC-Streamer](https://github.com/mpromonet/webrtc-streamer)
- [Neko](https://github.com/m1k1o/neko)
- [xRDP](https://github.com/neutrinolabs/xrdp) 