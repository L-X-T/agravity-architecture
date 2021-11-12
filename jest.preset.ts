const nxPreset = require('@nx/jest/preset');

module.exports = {
  ...nxPreset,
  resolver: '@nx/jest/plugins/resolver',
  testEnvironment: 'jest-environment-jsdom'
};
