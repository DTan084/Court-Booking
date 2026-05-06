import '@testing-library/jest-dom';
import * as fc from 'fast-check';

// Configure fast-check to run 100 iterations for all property tests
fc.configureGlobal({ numRuns: 100 });
