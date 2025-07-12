require('module-alias/register');

/**
 * TEST: FILE-BASIERTE WORKSPACE-ERKENNUNG
 * Terminal-Output über Files in /tmp/IDEWEB/{port}/
 */

const BrowserManager = require('@external/BrowserManager');
const FileBasedWorkspaceDetector = require('@services/workspace/FileBasedWorkspaceDetector');

async function testFileBasedDetection() {
  console.log('🚀 TEST: File-Based Workspace Detection');
  console.log('=======================================');
  
  try {
    // 1. BrowserManager erstellen
    console.log('\n1️⃣ Creating BrowserManager...');
    const browserManager = new BrowserManager();
    
    // 2. File-basierten Detector erstellen
    console.log('\n2️⃣ Creating File-based detector...');
    const fileDetector = new FileBasedWorkspaceDetector(browserManager);
    
    // 3. File-Struktur Status prüfen
    console.log('\n3️⃣ Checking file structure status...');
    const fileStatus = fileDetector.getFileStructureStatus();
    console.log('File Structure Status:', fileStatus);
    
    // 4. Für Port 9222 testen
    console.log('\n4️⃣ Testing file-based detection for port 9222...');
    
    // Workspace-Info abrufen
    console.log('   📁 Getting workspace info...');
    const workspaceInfo = await fileDetector.getWorkspaceInfo(9222);
    
    if (workspaceInfo) {
      console.log('   ✅ Workspace info found:');
      console.log(`      Port: ${workspaceInfo.port}`);
      console.log(`      Workspace: ${workspaceInfo.workspace}`);
      console.log(`      Files count: ${workspaceInfo.files.length}`);
      console.log(`      Git status: ${workspaceInfo.gitStatus ? 'Available' : 'Not available'}`);
      console.log(`      Session: ${workspaceInfo.session}`);
      console.log(`      Timestamp: ${workspaceInfo.timestamp}`);
      
      // Einzelne Methoden testen
      console.log('\n   🔧 Testing individual methods...');
      
      const workspacePath = await fileDetector.getWorkspacePath(9222);
      console.log(`      Workspace path: ${workspacePath}`);
      
      const filesList = await fileDetector.getFilesList(9222);
      console.log(`      Files list (first 5): ${filesList.slice(0, 5).join(', ')}`);
      
      const gitStatus = await fileDetector.getGitStatus(9222);
      console.log(`      Git status: ${gitStatus ? 'Available' : 'Not available'}`);
      
    } else {
      console.log('   ❌ No workspace info found');
    }
    
    // 5. Custom Command testen
    console.log('\n5️⃣ Testing custom command execution...');
    const customOutput = await fileDetector.executeCommand(9222, 'echo "Hello from IDE Web!"', 'custom-output.txt');
    console.log(`   Custom command output: ${customOutput}`);
    
    // 6. File-Struktur nach Test prüfen
    console.log('\n6️⃣ Final file structure status...');
    const finalFileStatus = fileDetector.getFileStructureStatus();
    console.log('Final File Structure Status:', finalFileStatus);
    
    // 7. Cache-Status prüfen
    console.log('\n7️⃣ Cache status...');
    const cacheStatus = fileDetector.getCacheStatus();
    console.log('Cache Status:', cacheStatus);
    
    console.log('\n✅ FILE-BASED TEST COMPLETED SUCCESSFULLY!');
    
  } catch (error) {
    console.error('\n❌ FILE-BASED TEST FAILED:', error);
    console.error('Error details:', error.stack);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    process.exit(0);
  }
}

// Test ausführen
testFileBasedDetection(); 