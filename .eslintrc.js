// 목적: 훅 의존성 누락(react-hooks/exhaustive-deps) 같은 조용한 버그를 잡는다.
// @react-native config 전체는 prettier 버전 충돌이 있어, react-hooks만 최소 구성으로 켠다.
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {jsx: true},
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  plugins: ['react-hooks'],
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    // 훅 의존성 누락을 에러로 강제 (조언 자동저장처럼 dep 빠져 조용히 안 되는 버그 방지)
    'react-hooks/exhaustive-deps': 'error',
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'android/',
    'ios/',
    'functions/',
    'scripts/',
    'cursor-talk-to-figma-mcp/',
    '*.config.js',
  ],
};
