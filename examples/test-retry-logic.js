/**
 * Test: Retry Logic Demonstration
 *
 * This script demonstrates the retry logic with exponential backoff
 */

const { withRetry, calculateBackoff } = require('../src/utils/retry');
const { NavigationError } = require('../src/utils/errors');

// Simulate a flaky operation that fails a few times then succeeds
let attemptCount = 0;
async function flakyOperation() {
  attemptCount++;
  console.log(`  Attempt ${attemptCount}...`);

  if (attemptCount < 3) {
    const error = new Error('Temporary network error');
    error.retryable = true;
    throw error;
  }

  return { success: true, data: 'Operation completed!' };
}

// Test 1: Successful retry
async function test1() {
  console.log('\n=== Test 1: Successful Retry After Failures ===\n');
  attemptCount = 0;

  try {
    const result = await withRetry(flakyOperation, {
      maxAttempts: 5,
      initialDelay: 500,
      onRetry: (attempt, error, delay) => {
        console.log(`  ⚠️  Failed (${error.message})`);
        console.log(`  ⏳ Waiting ${delay}ms before retry...`);
      }
    });

    console.log(`\n✅ Success! Result:`, result);
  } catch (error) {
    console.error(`\n❌ Failed:`, error.message);
  }
}

// Test 2: Exponential backoff calculation
async function test2() {
  console.log('\n=== Test 2: Exponential Backoff Calculation ===\n');

  console.log('Backoff delays with 1000ms initial delay, 2x multiplier:');
  for (let attempt = 1; attempt <= 6; attempt++) {
    const delay = calculateBackoff(attempt, 1000, 30000, 2);
    console.log(`  Attempt ${attempt}: ${delay}ms`);
  }
}

// Test 3: Max retries exceeded
async function test3() {
  console.log('\n=== Test 3: Max Retries Exceeded ===\n');
  attemptCount = 0;

  async function alwaysFailsOperation() {
    attemptCount++;
    console.log(`  Attempt ${attemptCount}...`);
    const error = new Error('Persistent error');
    error.retryable = true;
    throw error;
  }

  try {
    await withRetry(alwaysFailsOperation, {
      maxAttempts: 3,
      initialDelay: 100,
      onRetry: (attempt, error, delay) => {
        console.log(`  ⚠️  Failed, retrying in ${delay}ms...`);
      }
    });
  } catch (error) {
    console.log(`\n❌ Final failure after 3 attempts: ${error.message}`);
  }
}

// Test 4: Non-retryable error
async function test4() {
  console.log('\n=== Test 4: Non-Retryable Error (Fail Fast) ===\n');
  attemptCount = 0;

  async function nonRetryableOperation() {
    attemptCount++;
    console.log(`  Attempt ${attemptCount}...`);
    const error = new Error('Validation error - not retryable');
    error.retryable = false;
    throw error;
  }

  try {
    await withRetry(nonRetryableOperation, {
      maxAttempts: 5,
      initialDelay: 100,
      onRetry: (attempt, error, delay) => {
        console.log(`  ⚠️  Retrying...`);
      }
    });
  } catch (error) {
    console.log(`\n❌ Failed immediately (no retry): ${error.message}`);
  }
}

// Main
async function main() {
  console.log('🧪 Retry Logic Tests\n');
  console.log('This demonstrates the exponential backoff retry mechanism.');

  await test1();
  await test2();
  await test3();
  await test4();

  console.log('\n✨ All tests completed!\n');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { test1, test2, test3, test4 };
