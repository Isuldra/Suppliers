import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReactConfig from 'eslint-plugin-react/configs/recommended.js';
import prettierConfig from 'eslint-config-prettier';

export default [
  { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } }, // Added node globals for main process
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Apply React plugin settings specifically to React files
    files: ['src/renderer/**/*.{js,jsx,ts,tsx}'],
    ...pluginReactConfig,
    settings: {
      react: {
        version: 'detect', // Automatically detect React version
      },
    },
  },
  {
    // Add custom rules or overrides here if needed
    rules: {
      // Example: Disable a specific rule
      // "react/react-in-jsx-scope": "off"
      // Example: Add a TypeScript-specific rule
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'off', // Often conflicts with TypeScript global types
    },
  },
  {
    // Ignore specific files/directories
    ignores: [
      'dist/',
      'release/',
      'node_modules/',
      '.vite/',
      '*.config.js',
      '*.config.cjs',
      'scripts/',
      '**/*.cjs', // Ignore all .cjs files
    ],
  },
  // Prettier config must be last to override other formatting rules
  prettierConfig,
];
