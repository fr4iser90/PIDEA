
require('module-alias/register');

/**
 * TEST: FILE-BASIERTE WORKSPACE-ERKENNUNG
 * Terminal-Output über Files in /tmp/IDEWEB/{port}/
 */

const BrowserManager = require('@external/BrowserManager');
const FileBasedWorkspaceDetector = require('@services/workspace/FileBasedWorkspaceDetector');
const { logger } = require('@infrastructure/logging/Logger');

async function testFileBasedDetection() {
  logger.debug('🚀 TEST: File-Based Workspace Detection');
  logger.log('=======================================');
  
  try {
    // 1. BrowserManager erstellen
    logger.log('\n1️⃣ Creating BrowserManager...');
    const browserManager = new BrowserManager();
    
    // 2. File-basierten Detector erstellen
    logger.log('\n2️⃣ Creating File-based detector...');
    const fileDetector = new FileBasedWorkspaceDetector(browserManager);
    
    // 3. File-Struktur Status prüfen
    logger.log('\n3️⃣ Checking file structure status...');
    const fileStatus = fileDetector.getFileStructureStatus();
    logger.log('File Structure Status:', fileStatus);
    
    // 4. Für Port 9222 testen
    logger.debug('\n4️⃣ Testing file-based detection for port 9222...');
    
    // Workspace-Info abrufen
    logger.log('   📁 Getting workspace info...');
    const workspaceInfo = await fileDetector.getWorkspaceInfo(9222);
    
    if (workspaceInfo) {
      logger.log('   ✅ Workspace info found:');
      logger.log(`      Port: ${workspaceInfo.port}`);
      logger.log(`      Workspace: ${workspaceInfo.workspace}`);
      logger.log(`      Files count: ${workspaceInfo.files.length}`);
      logger.log(`      Git status: ${workspaceInfo.gitStatus ? 'Available' : 'Not available'}`);
      logger.log(`      Session: ${workspaceInfo.session}`);
      logger.log(`      Timestamp: ${workspaceInfo.timestamp}`);
      
      // Einzelne Methoden testen
      logger.debug('\n   🔧 Testing individual methods...');
      
      const workspacePath = await fileDetector.getWorkspacePath(9222);
      logger.log(`      Workspace path: ${workspacePath}`);
      
      const filesList = await fileDetector.getFilesList(9222);
      logger.log(`      Files list (first 5): ${filesList.slice(0, 5).join(', ')}`);
      
      const gitStatus = await fileDetector.getGitStatus(9222);
      logger.log(`      Git status: ${gitStatus ? 'Available' : 'Not available'}`);
      
    } else {
      logger.log('   ❌ No workspace info found');
    }
    
    // 5. Custom Command testen
    logger.debug('\n5️⃣ Testing custom command execution...');
    const customOutput = await fileDetector.executeCommand(9222, 'echo "Hello from IDE Web!"', 'custom-output.txt');
    logger.log(`   Custom command output: ${customOutput}`);
    
    // 6. File-Struktur nach Test prüfen
    logger.log('\n6️⃣ Final file structure status...');
    const finalFileStatus = fileDetector.getFileStructureStatus();
    logger.log('Final File Structure Status:', finalFileStatus);
    
    // 7. Cache-Status prüfen
    logger.log('\n7️⃣ Cache status...');
    const cacheStatus = fileDetector.getCacheStatus();
    logger.log('Cache Status:', cacheStatus);
    
    logger.debug('\n✅ FILE-BASED TEST COMPLETED SUCCESSFULLY!');
    
  } catch (error) {
    logger.error('\n❌ FILE-BASED TEST FAILED:', error);
    logger.error('Error details:', error.stack);
  } finally {
    // Cleanup
    logger.log('\n🧹 Cleaning up...');
    process.exit(0);
  }
}

// Test ausführen
testFileBasedDetection(); 