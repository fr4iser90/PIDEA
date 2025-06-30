const chokidar = require('chokidar');
const WebSocket = require('ws');

// WebSocket server for live reload
const wss = new WebSocket.Server({ port: 3001 });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('[Dev Server] Client connected for live reload');
  
  ws.on('close', () => {
    clients.delete(ws);
    console.log('[Dev Server] Client disconnected');
  });
});

// Function to notify all clients to reload
function notifyReload(filePath) {
  console.log(`[Dev Server] File changed: ${filePath}`);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'reload', file: filePath }));
    }
  });
}

// Watch for file changes
const watcher = chokidar.watch(['web/**/*'], {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true
});

watcher
  .on('add', path => {
    console.log(`[Dev Server] File added: ${path}`);
    notifyReload(path);
  })
  .on('change', path => {
    console.log(`[Dev Server] File changed: ${path}`);
    notifyReload(path);
  })
  .on('unlink', path => {
    console.log(`[Dev Server] File removed: ${path}`);
    notifyReload(path);
  });

console.log('[Dev Server] Watching for file changes in web/ directory...');
console.log('[Dev Server] WebSocket server running on port 3001'); 