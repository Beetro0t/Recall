import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { clearAllStorageForTesting } from '../services/storage';

afterEach(() => {
  cleanup();
  clearAllStorageForTesting();
});
