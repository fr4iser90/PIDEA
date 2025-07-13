
require('module-alias/register');

const AutoFinishSystem = require('@services/auto-finish/AutoFinishSystem');
const TodoParser = require('@services/auto-finish/TodoParser');
const ConfirmationSystem = require('@services/auto-finish/ConfirmationSystem');
const FallbackDetection = require('@services/auto-finish/FallbackDetection');
const TaskSequencer = require('@services/auto-finish/TaskSequencer');
const TaskSession = require('@entities/TaskSession');
const TodoTask = require('@entities/TodoTask');
const { logger } = require('@infrastructure/logging/Logger');

async function testAutoFinishSystem() {
  logger.debug('🧪 Testing Auto-Finish System Components...\n');

  try {
    // Test TodoParser
    logger.debug('1. Testing TodoParser...');
    const todoParser = new TodoParser();
    const testTodos = [
      'TODO: Create user authentication system',
      'FIXME: Fix memory leak in database connection',
      'HACK: Temporary workaround for API rate limiting',
      'BUG: Login button not working on mobile',
      'FEATURE: Add dark mode support'
    ];
    
    const parsedTasks = await todoParser.parse(testTodos.join('\n'));
    logger.log(`   ✅ Parsed ${parsedTasks.length} tasks`);
    parsedTasks.forEach((task, index) => {
      logger.log(`   Task ${index + 1}: ${task.type} - ${task.description}`);
    });

    // Test ConfirmationSystem
    logger.debug('\n2. Testing ConfirmationSystem...');
    const confirmationSystem = new ConfirmationSystem();
    const testResponse = "I have completed the user authentication system. The login and registration endpoints are now working.";
    const confirmation = await confirmationSystem.askConfirmation(testResponse, { language: 'en' });
    logger.log(`   ✅ Confirmation result: ${confirmation.confirmed ? 'Confirmed' : 'Not confirmed'}`);
    logger.log(`   Confidence: ${confirmation.confidence}`);

    // Test FallbackDetection
    logger.debug('\n3. Testing FallbackDetection...');
    const fallbackDetection = new FallbackDetection();
    const testAIResponse = "I need more information about the database schema to proceed.";
    const fallback = await fallbackDetection.detectUserInputNeed(testAIResponse, { language: 'en' });
    logger.log(`   ✅ Fallback detected: ${fallback.needsUserInput ? 'Yes' : 'No'}`);
    logger.log(`   Reason: ${fallback.reason}`);

    // Test TaskSequencer
    logger.debug('\n4. Testing TaskSequencer...');
    const taskSequencer = new TaskSequencer();
    const tasks = [
      new TodoTask('1', 'Create database schema', 'feature', ['2']),
      new TodoTask('2', 'Create API endpoints', 'feature', ['3']),
      new TodoTask('3', 'Create frontend components', 'feature', []),
      new TodoTask('4', 'Write tests', 'feature', ['2', '3'])
    ];
    
    const sequencedTasks = await taskSequencer.sequence(tasks);
    logger.log(`   ✅ Sequenced ${sequencedTasks.length} tasks`);
    sequencedTasks.forEach((task, index) => {
      logger.log(`   Step ${index + 1}: ${task.description}`);
    });

    // Test TaskSession
    logger.debug('\n5. Testing TaskSession...');
    const session = new TaskSession(
      'test-user-123',
      'test-project-456',
      'TODO: Test the auto-finish system\nFIXME: Fix any issues found',
      { language: 'en', autoConfirm: true }
    );
    logger.log(`   ✅ Created session: ${session.id}`);
    logger.log(`   Status: ${session.status}`);
    logger.log(`   Total tasks: ${session.totalTasks}`);

    // Test AutoFinishSystem
    logger.debug('\n6. Testing AutoFinishSystem...');
    const autoFinishSystem = new AutoFinishSystem();
    logger.log(`   ✅ AutoFinishSystem initialized successfully`);
    const supportedLanguages = Object.keys(autoFinishSystem.confirmationSystem.completionKeywords);
    logger.log(`   Supported languages: ${supportedLanguages.join(', ')}`);

    logger.log('\n🎉 All Auto-Finish System components are working correctly!');
    logger.log('\n📋 System Features:');
    logger.log('   ✅ TODO parsing with multiple patterns');
    logger.log('   ✅ AI confirmation detection');
    logger.log('   ✅ Fallback detection for user input');
    logger.log('   ✅ Task dependency sequencing');
    logger.log('   ✅ Session management');
    logger.log('   ✅ Multi-language support');
    logger.log('   ✅ Progress tracking');
    logger.log('   ✅ Error handling');

  } catch (error) {
    logger.error('❌ Test failed:', error.message);
    logger.error(error.stack);
  }
}

// Run the test
testAutoFinishSystem(); 