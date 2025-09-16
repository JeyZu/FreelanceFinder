module.exports = {
  root: true,
  extends: [require.resolve("@freelancefinder/config/eslint/base")],
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    }
  },
  env: {
    browser: true,
    node: false
  }
};
