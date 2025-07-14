
require('module-alias/register');

/**
 * TEST: FILE-BASIERTE WORKSPACE-ERKENNUNG
 * Terminal-Output über Files in /tmp/IDEWEB/{port}/
 */

const BrowserManager = require('@external/BrowserManager');
const FileBasedWorkspaceDetector = require('@services/workspace/FileBasedWorkspaceDetector');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

async function testFileBasedDetection() {
  logger.debug('🚀 TEST: File-Based Workspace Detection');
  logger.info('=======================================');
  
  try {
    // 1. BrowserManager erstellen
    logger.info('\n1️⃣ Creating BrowserManager...');
    const browserManager = new BrowserManager();
    
    // 2. File-basierten Detector erstellen
    logger.info('\n2️⃣ Creating File-based detector...');
    const fileDetector = new FileBasedWorkspaceDetector(browserManager);
    
    // 3. File-Struktur Status prüfen
    logger.info('\n3️⃣ Checking file structure status...');
    const fileStatus = fileDetector.getFileStructureStatus();
    logger.info('File Structure Status:', fileStatus);
    
    // 4. Für Port 9222 testen
    logger.debug('\n4️⃣ Testing file-based detection for port 9222...');
    
    // Workspace-Info abrufen
    logger.info('   📁 Getting workspace info...');
    const workspaceInfo = await fileDetector.getWorkspaceInfo(9222);
    
    if (workspaceInfo) {
      logger.info('   ✅ Workspace info found:');
      logger.info(`      Port: ${workspaceInfo.port}`);
      logger.info(`      Workspace: ${workspaceInfo.workspace}`);
      logger.info(`      Files count: ${workspaceInfo.files.length}`);
      logger.info(`      Git status: ${workspaceInfo.gitStatus ? 'Available' : 'Not available'}`);
      logger.info(`      Session: ${workspaceInfo.session}`);
      logger.info(`      Timestamp: ${workspaceInfo.timestamp}`);
      
      // Einzelne Methoden testen
      logger.debug('\n   🔧 Testing individual methods...');
      
      const workspacePath = await fileDetector.getWorkspacePath(9222);
      logger.info(`      Workspace path: ${workspacePath}`);
      
      const filesList = await fileDetector.getFilesList(9222);
      logger.info(`      Files list (first 5): ${filesList.slice(0, 5).join(', ')}`);
      
      const gitStatus = await fileDetector.getGitStatus(9222);
      logger.info(`      Git status: ${gitStatus ? 'Available' : 'Not available'}`);
      
    } else {
      logger.info('   ❌ No workspace info found');
    }
    
    // 5. Custom Command testen
    logger.debug('\n5️⃣ Testing custom command execution...');
    const customOutput = await fileDetector.executeCommand(9222, 'echo "Hello from IDE Web!"', 'custom-output.txt');
    logger.info(`   Custom command output: ${customOutput}`);
    
    // 6. File-Struktur nach Test prüfen
    logger.info('\n6️⃣ Final file structure status...');
    const finalFileStatus = fileDetector.getFileStructureStatus();
    logger.info('Final File Structure Status:', finalFileStatus);
    
    // 7. Cache-Status prüfen
    logger.info('\n7️⃣ Cache status...');
    const cacheStatus = fileDetector.getCacheStatus();
    logger.info('Cache Status:', cacheStatus);
    
    logger.debug('\n✅ FILE-BASED TEST COMPLETED SUCCESSFULLY!');
    
  } catch (error) {
    logger.error('\n❌ FILE-BASED TEST FAILED:', error);
    logger.error('Error details:', error.stack);
  } finally {
    // Cleanup
    logger.info('\n🧹 Cleaning up...');
    process.exit(0);
  }
}

// Test ausführen
testFileBasedDetection(); 