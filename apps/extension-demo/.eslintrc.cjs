const baseConfig = require("@freelancefinder/config/eslint/base");

module.exports = {
  ...baseConfig,
  env: {
    ...baseConfig.env,
    browser: true,
  },
  ignorePatterns: ["dist/**", "node_modules/**"],
};
