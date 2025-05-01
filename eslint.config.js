// eslint.config.js
import tseslint from 'typescript-eslint';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import eslintPluginImport from 'eslint-plugin-import';

export default [
  ...tseslint.configs.recommended,
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '.webpack/**',
      'fixtures/**',
    ],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'prettier': eslintPluginPrettier,
      'import': eslintPluginImport,
    },
    rules: {
      'prettier/prettier': 'warn',
      'no-console': 'off',
      'import/extensions': [
        'error',
        'ignorePackages',
        {
          'ts': 'never',
          'js': 'never',
        },
      ],
      'import/no-unresolved': 'error',
      'import/prefer-default-export': 'off',
      'import/no-extraneous-dependencies': 'off',
      '@typescript-eslint/no-unused-vars': ['warn'],
      '@typescript-eslint/no-explicit-any': ['warn'],
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
        node: {
          extensions: ['.js', '.ts'],
        },
      },
    },
  },
];