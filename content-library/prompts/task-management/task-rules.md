## The Quintessence of the 12-Factor App

**Goal:** Build apps that behave the same across environments, are maintainable, and scale automatically.

1. **Codebase:** One repo per app; config/env come from outside.  
2. **Dependencies:** Declare all explicitly; no hidden system packages.  
3. **Config:** Store secrets/settings in env vars, not code.  
4. **Backing Services:** Treat DBs, queues, APIs as replaceable.  
5. **Build/Release/Run:** Separate build (image), release (image + config), and run (container).  
6. **Processes:** Stateless; persist data in Redis/DB.  
7. **Port Binding:** App runs its own HTTP server; proxy optional.  
8. **Concurrency:** Scale horizontally via containers.  
9. **Disposability:** Start fast, stop cleanly; handle SIGTERM.  
10. **Dev/Prod Parity:** Keep environments identical.  
11. **Logs:** Stream to stdout/stderr; external collector stores them.  
12. **Admin Processes:** Run one-off tasks (e.g., migrations) separately.
