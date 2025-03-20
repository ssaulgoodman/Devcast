import 'openai/shims/node'; // Add OpenAI shim for Node environment
// Import @testing-library/jest-dom to extend Jest with DOM specific matchers
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    route: '/',
    pathname: '',
    query: {},
    asPath: '',
    push: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn().mockResolvedValue(undefined),
    beforePopState: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
    isFallback: false,
  }),
}));

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({ 
    data: {
      user: { name: 'Test User', email: 'test@example.com' },
      expires: '1'
    }, 
    status: 'authenticated' 
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  getProviders: jest.fn(),
  getCsrfToken: jest.fn(),
}));

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  isAxiosError: jest.fn()
}));

// Add polyfills for testing environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Clear mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Make console.error/warn not fail tests but still log
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    originalConsoleError(...args);
  };
  
  console.warn = (...args) => {
    originalConsoleWarn(...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
}); 