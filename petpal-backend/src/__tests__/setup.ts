// Test setup file
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

beforeAll(() => {
  // Mock console.error to suppress expected error messages in tests
  console.error = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});

// Global test timeout
jest.setTimeout(10000);

// Mock external API calls for testing
jest.mock('../services/aiService', () => ({
  AIService: {
    getFoodSafetyAdvice: jest.fn().mockResolvedValue({
      food: 'test-food',
      pet: 'test-pet',
      safety: 'unknown',
      message: 'Test AI response',
      details: {
        description: 'Test description',
        recommendation: 'Test recommendation'
      }
    })
  }
}));

jest.mock('../services/externalApiService', () => ({
  ExternalApiService: {
    searchAllSources: jest.fn().mockResolvedValue(null)
  }
}));
