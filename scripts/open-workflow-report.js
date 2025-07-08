#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const reportPath = path.join(__dirname, '..', 'output', 'workflow-analysis', 'workflow-analysis.html');

if (fs.existsSync(reportPath)) {
  console.log('🌐 Opening PIDEA Workflow Analysis Report...');
  console.log(`📄 Report location: ${reportPath}`);
  
  // Open in default browser
  exec(`xdg-open "${reportPath}"`, (error) => {
    if (error) {
      console.error('❌ Error opening browser:', error.message);
      console.log('💡 Try opening manually:', reportPath);
    } else {
      console.log('✅ Report opened in browser!');
    }
  });
} else {
  console.error('❌ Report not found!');
  console.log('💡 Run the analysis first: npm run analyze:workflows');
} 