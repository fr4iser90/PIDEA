const Application = require('./Application');
console.log('🔍 Testing Application Service Registration and Layer Validation');
(async () => {
  try {
    const app = new Application();
    await app.initialize();
    
    console.log('✅ Application initialized successfully');
    
    // Test if new Application Services are registered
    const analysisAppService = app.serviceRegistry.getService('analysisApplicationService');
    console.log('✅ AnalysisApplicationService registered:', !!analysisAppService);
    
    const projectAppService = app.serviceRegistry.getService('projectApplicationService');
    console.log('✅ ProjectApplicationService registered:', !!projectAppService);
    
    const taskAppService = app.serviceRegistry.getService('taskApplicationService');
    console.log('✅ TaskApplicationService registered:', !!taskAppService);
    
    const ideAppService = app.serviceRegistry.getService('ideApplicationService');
    console.log('✅ IDEApplicationService registered:', !!ideAppService);
    
    // Test layer validation after Application Service creation
    const service = app.serviceRegistry.getService('advancedAnalysisService');
    const result = await service.layerValidationService.validateLayers(process.cwd());
    
    console.log('\n🎯 LAYER VALIDATION RESULTS AFTER APPLICATION SERVICES:');
    console.log('Overall Valid:', result.overall);
    console.log('Total Violations:', result.violations.length);
    console.log('Boundary Violations:', result.violations.filter(v => v.type === 'boundary-violation').length);
    console.log('Import Violations:', result.violations.filter(v => v.type === 'import-violation').length);
    
    // Check specific controller violations
    const boundaryViolations = result.violations.filter(v => v.type === 'boundary-violation');
    const controllerViolations = boundaryViolations.filter(v => v.file && v.file.includes('Controller'));
    console.log('Controller Boundary Violations:', controllerViolations.length);
    
    if (controllerViolations.length > 0) {
      console.log('\n❌ Remaining Controller Violations:');
      controllerViolations.slice(0, 5).forEach(v => {
        console.log(`  ${v.file}: ${v.message}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
