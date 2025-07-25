module.exports = {
  // Mock CSS Modules to prevent errors during tests
  moduleNameMapper: {
    '\.css$': 'identity-obj-proxy',
  },
  testEnvironment: 'jsdom',
  transformIgnorePatterns: [
    '/node_modules/(?!(@kitware/vtk.js|vtk.js))/',
  ],
};