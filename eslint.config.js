import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'dist-landing', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  // Ranh giới giữ sẵn cho lúc tách monorepo (docs/system/01-core.md, INV-CORE-01 + 02).
  // `(^|/)tools/` bắt cả alias `@/tools/...` lẫn đường dẫn tương đối `../../tools/...`.
  // no-restricted-imports không xét import() động, nên thêm no-restricted-syntax cho ImportExpression.
  {
    // Landing (domain riêng) không được dùng code của tool nào, nhất là canvas thật.
    files: ['src/routes/landing/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '(^|/)tools/',
              message: 'Landing độc lập với app: không import từ src/tools/ (spec canvas-landing-demo).',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "ImportExpression[source.value=/(^|\\/)tools\\//]",
          message: 'Landing độc lập với app: không import từ src/tools/ (spec canvas-landing-demo).',
        },
      ],
    },
  },
  {
    // Code dùng chung không import ngược vào tool, để sau gom được thành packages/shared.
    // Tool cần hiện gì ở phần chung (phím tắt, số liệu) thì đăng ký qua src/register-tools.ts.
    files: ['src/lib/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '(^|/)tools/',
              message: 'Code dùng chung (lib/, components/) không import ngược vào src/tools/.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "ImportExpression[source.value=/(^|\\/)tools\\//]",
          message: 'Code dùng chung (lib/, components/) không import ngược vào src/tools/.',
        },
      ],
    },
  },
);
