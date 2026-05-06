import '@testing-library/jest-dom';
import * as fc from 'fast-check';
import React from 'react';

// Make React available globally for JSX
globalThis.React = React;

// Configure fast-check to run 100 iterations for all property tests
fc.configureGlobal({ numRuns: 100 });
