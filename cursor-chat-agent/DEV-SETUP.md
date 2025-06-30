# Development Setup with Hot Reloading

## Quick Start

```bash
# Install dependencies and start development environment
./start-dev.sh
```

## Manual Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Scripts

- **`npm run dev`** - Start backend with nodemon (auto-restart on server changes)
- **`npm run dev:frontend`** - Start frontend file watcher (WebSocket live reload)
- **`npm run dev:full`** - Start both backend and frontend with hot reloading
- **`npm start`** - Start production server

### 3. Hot Reloading Features

#### Backend Hot Reloading
- **nodemon** watches `server.js` and `web/` directory
- Automatically restarts server when backend files change
- Monitors `.js`, `.html`, `.css` file extensions

#### Frontend Hot Reloading
- **WebSocket server** on port 3001 for live reloading
- **chokidar** watches `web/` directory for file changes
- Automatically reloads browser when frontend files change
- No page refresh needed for CSS changes

### 4. Development Workflow

1. Start development environment: `npm run dev:full`
2. Open browser to `http://localhost:3000`
3. Make changes to any files in `web/` or `server.js`
4. Changes are automatically applied:
   - Backend changes → Server restarts
   - Frontend changes → Browser reloads

### 5. File Structure

```
cursor-chat-agent/
├── server.js          # Main server (auto-restart with nodemon)
├── dev-server.js      # Frontend file watcher (WebSocket server)
├── web/
│   ├── index.html     # Main page (live reload)
│   └── main.css       # Styles (live reload)
├── package.json       # Dependencies and scripts
└── start-dev.sh       # Quick start script
```

### 6. Troubleshooting

- **WebSocket connection failed**: Make sure dev-server.js is running
- **Server not restarting**: Check if nodemon is installed and running
- **Browser not reloading**: Check browser console for WebSocket errors
- **Port conflicts**: Change ports in server.js and dev-server.js if needed 