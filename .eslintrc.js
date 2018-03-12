module.exports = {
  env: {
    commonjs: true,
    es6: true,
    node: true,
    browser: false,
  },
  extends: 'eslint:recommended',
  rules: {
    'max-len': ['error', 80],
    'no-console': 0,
    'no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    quotes: ['error', 'single', {
      allowTemplateLiterals: true,
    }],
  }
};
