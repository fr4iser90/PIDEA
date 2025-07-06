#!/usr/bin/env node

const path = require('path');
const { spawn } = require('child_process');

// Run the backend setup script
const setupScript = path.join(__dirname, 'backend/scripts/dev-setup.js');

console.log('🚀 PIDEA Development Setup');
console.log('==========================');
console.log('Starting development setup menu...');
console.log('');

const setupProcess = spawn('node', [setupScript], {
  stdio: 'inherit',
  shell: true
});

setupProcess.on('error', (error) => {
  console.error('❌ Failed to start setup:', error.message);
  process.exit(1);
});

setupProcess.on('close', (code) => {
  process.exit(code);
}); 