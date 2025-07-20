const path = require('path');
const fs = require('fs');

// Direct test of layer violations without DI initialization
async function testControllerRefactoringProgress() {
    console.log('🧪 Testing Controller Refactoring Progress...\n');
    
    try {
        // Change to backend directory for proper alias resolution
        process.chdir(path.join(__dirname, 'backend'));
        
        // Import the LayerValidationService directly using alias
        const LayerValidationService = require('@domain/services/LayerValidationService');
        const Logger = require('@logging/Logger');
        
        const logger = new Logger('LayerValidationTest');
        const layerValidationService = new LayerValidationService(logger);
        
        console.log('📊 Running layer boundary validation on controllers...\n');
        
        // Test specific controllers we've refactored
        const refactoredControllers = [
            'backend/presentation/api/AuthController.js',
            'backend/presentation/api/AnalysisController.js', 
            'backend/presentation/api/TaskController.js',
            'backend/presentation/api/GitController.js'
        ];
        
        const stillViolatingControllers = [
            'backend/presentation/api/WorkflowController.js',
            'backend/presentation/api/IDEController.js',
            'backend/presentation/api/WebChatController.js',
            'backend/presentation/api/StreamingController.js',
            'backend/presentation/api/ContentLibraryController.js',
            'backend/presentation/api/CodeExplorerController.js'
        ];
        
        console.log('🔍 Testing REFACTORED controllers (should have reduced violations):');
        console.log('='.repeat(60));
        
        let refactoredViolations = 0;
        for (const controller of refactoredControllers) {
            const result = await layerValidationService.validateLayerBoundaries([controller]);
            const violations = result.totalViolations;
            refactoredViolations += violations;
            
            const status = violations === 0 ? '✅' : '⚠️';
            console.log(`${status} ${path.basename(controller)}: ${violations} violations`);
            
            if (violations > 0) {
                result.invalidFiles.forEach(file => {
                    file.violations.forEach(violation => {
                        console.log(`   - ${violation.type}: ${violation.message}`);
                    });
                });
            }
        }
        
        console.log('\n🔍 Testing NON-REFACTORED controllers (will still have violations):');
        console.log('='.repeat(60));
        
        let nonRefactoredViolations = 0;
        for (const controller of stillViolatingControllers) {
            if (fs.existsSync(controller)) {
                const result = await layerValidationService.validateLayerBoundaries([controller]);
                const violations = result.totalViolations;
                nonRefactoredViolations += violations;
                
                console.log(`❌ ${path.basename(controller)}: ${violations} violations`);
            }
        }
        
        console.log('\n📊 REFACTORING PROGRESS SUMMARY:');
        console.log('='.repeat(60));
        console.log(`✅ Refactored controllers total violations: ${refactoredViolations}`);
        console.log(`❌ Non-refactored controllers total violations: ${nonRefactoredViolations}`);
        console.log(`🎯 Total violations found: ${refactoredViolations + nonRefactoredViolations}`);
        
        if (refactoredViolations === 0) {
            console.log('🎉 SUCCESS: All refactored controllers have ZERO layer boundary violations!');
        } else {
            console.log(`⚠️  Progress: Refactored controllers still have ${refactoredViolations} violations to fix`);
        }
        
        console.log('\n📈 NEXT STEPS:');
        if (refactoredViolations === 0) {
            console.log('1. ✅ Continue refactoring remaining controllers');
            console.log('2. ✅ Update controllers to use proper Application Service dependencies');
            console.log('3. ✅ Run full validation when all controllers are refactored');
        } else {
            console.log('1. 🔧 Complete refactoring of current controllers');
            console.log('2. 🔧 Fix remaining imports and dependencies');
            console.log('3. 🔧 Update constructor parameters to use Application Services');
        }
        
        return {
            refactoredViolations,
            nonRefactoredViolations,
            totalViolations: refactoredViolations + nonRefactoredViolations,
            success: refactoredViolations === 0
        };
        
    } catch (error) {
        console.error('❌ Error testing controller refactoring:', error);
        console.error(error.stack);
        return null;
    }
}

// Run the test
testControllerRefactoringProgress()
    .then(result => {
        if (result) {
            console.log('\n✅ Controller refactoring test completed');
            process.exit(result.success ? 0 : 1);
        } else {
            console.log('\n❌ Controller refactoring test failed');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('💥 Unexpected error:', error);
        process.exit(1);
    }); 