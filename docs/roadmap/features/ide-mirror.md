# IDE Mirror Features - Screenshot Streaming

## Current State Analysis

### **Existing Implementation**
- **IDEMirrorService**: Single screenshot capture on user actions (click/type)
- **BrowserManager**: Basic Playwright screenshot with PNG format
- **WebSocketManager**: JSON-based messaging, no binary data support
- **IDEMirrorComponent**: Static image rendering with overlay elements
- **IDEMirrorController**: Action-triggered screenshots with smart timing

### **Current Limitations**
- Screenshots only on user interactions (not continuous)
- PNG format (large file sizes, no compression)
- No frame buffering or streaming
- WebSocket only supports JSON (not binary data)
- Frontend uses static `<img>` tags (flickering on updates)

---

## **Objective**
- Smooth, continuous IDE streaming (video-like, 10fps+)
- Low bandwidth usage (compression, region updates)
- No flickering, no lag
- Split into small, independent tasks

---

## **1. Screenshot Streaming Loop**
- [ ] **Add:** Continuous screenshot loop (e.g., setInterval/timer, target: 10–20fps)
- [ ] **Add:** Configurable framerate (FPS as variable/config)
- [ ] **Change:** Screenshots not only on actions, but in continuous loop
- [ ] **Remove:** Old single-screenshot triggers

## **2. Screenshot Compression & Bandwidth**
- [ ] **Add:** WebP/JPEG compression (instead of PNG)
- [ ] **Add:** Compression parameters (quality, target size)
- [ ] **Change:** Screenshot API returns compressed frames
- [ ] **Add:** Measurement: frame size, bandwidth per minute

## **3. WebSocket Streaming**
- [ ] **Add:** Send screenshots as binary data (Blob/ArrayBuffer) via WebSocket
- [ ] **Add:** Batching/throttling for slow clients
- [ ] **Change:** API/Controller for continuous streaming
- [ ] **Remove:** Single-image HTTP endpoints (optional)

## **4. Flicker-free Updates (Frontend)**
- [ ] **Add:** Double-buffering (two canvases/images, smooth transition)
- [ ] **Add:** CSS transitions for image changes
- [ ] **Change:** Frontend renders frames like video (Canvas/Video tag)

## **5. Region Updates (Advanced, optional)**
- [ ] **Add:** Detection of changed areas (diff algorithm)
- [ ] **Add:** Send only patches/regions instead of full frame
- [ ] **Change:** Frontend assembles patches into complete image

## **6. Configurability & UI**
- [ ] **Add:** UI/Config for FPS, quality, region mode
- [ ] **Add:** Live display: FPS, bandwidth, frame size

## **7. Testing & Monitoring**
- [ ] **Add:** Performance metrics (FPS, latency, bandwidth)
- [ ] **Add:** Debug overlay for frame statistics
- [ ] **Add:** Error handling for frame drops/connection issues

---

## **What will be removed/changed?**
- [ ] **Remove:** Single-shot screenshot triggers (action-based)
- [ ] **Remove:** PNG-only API (replace with WebP/JPEG)
- [ ] **Change:** Screenshot API/Controller to streaming logic
- [ ] **Change:** Frontend from `<img>` replacement to Canvas/Video rendering

---

## **Implementation Order (Recommended)**
1. **Screenshot Loop + Compression (10fps, WebP/JPEG, full-frame)**
2. **WebSocket Streaming (binary, loop)**
3. **Frontend: Canvas/Double-buffering**
4. **Region Updates (optional, advanced)**
5. **UI/Config, Monitoring, Polishing**

---

## **Technical Requirements**

### **Backend Requirements**
- **Node.js**: 16+ (for WebP support)
- **Playwright**: Latest version (for screenshot compression)
- **WebSocket**: Binary message support
- **Memory**: Frame buffer management (prevent memory leaks)

### **Frontend Requirements**
- **Canvas API**: For smooth frame rendering
- **WebSocket**: Binary message reception
- **CSS**: Transitions for smooth updates
- **Performance**: 60fps rendering capability

### **Network Requirements**
- **Bandwidth**: Target <1MB/minute for 10fps
- **Latency**: <100ms frame-to-display
- **Compression**: WebP preferred, JPEG fallback

---

## **Performance Targets**
- **Framerate**: 10-20fps (configurable)
- **Frame Size**: <50KB per frame (compressed)
- **Bandwidth**: <1MB/minute
- **Latency**: <100ms end-to-end
- **CPU Usage**: <10% on modern hardware
- **Memory**: <100MB buffer size

---

**Each task is independent and can be implemented separately.**
**Start: Loop + Compression + WebSocket Stream only.** 