const path = require('path');

const { resolve } = path;

const root = resolve(__dirname, '..');
const rootConfig = require(`${root}/jest.config.js`);

module.exports = {
    ...rootConfig,
    ...{
        rootDir: root,
        displayName: 'functional-tests',
        automock: false,
        bail: true,
        clearMocks: true,
        collectCoverage: true,
        collectCoverageFrom: ['app/**'],
        coverageDirectory: 'tests/coverage',
        coverageReporters: ['text', 'lcovonly'],
        testEnvironment: 'node',
        setupFilesAfterEnv: ['<rootDir>/tests/jest_setup.js'],
        testMatch: ['**/tests/integration/*.spec.js?(x)'],
        transformIgnorePatterns: ['<rootDir>/node_modules/'],
        verbose: true
    }
};
