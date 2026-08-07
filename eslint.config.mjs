// @ts-check
import tseslint from 'typescript-eslint'
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y'
import prettierConfig from 'eslint-config-prettier'

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/out/**',
      '**/.turbo/**',
      '**/generated/**',
      '**/*.tsbuildinfo',
      '**/next-env.d.ts',
      'pnpm-lock.yaml',
    ],
  },

  ...tseslint.configs.recommended,

  prettierConfig,

  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',

      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },

  // NestJS DI tokens use class refs as reflect-metadata at runtime; `import type`
  // would strip them from JS output and break DI. Must come AFTER global rules.
  {
    files: ['apps/api/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },

  // JSX a11y — recommended set on the web frontend only.
  {
    files: ['apps/web/**/*.jsx', 'apps/web/**/*.tsx'],
    plugins: { 'jsx-a11y': jsxA11yPlugin },
    rules: {
      ...jsxA11yPlugin.configs.recommended.rules,
      // CLAUDE.md mandates `<ul role="list">` — Safari drops the implicit
      // list role when `list-style: none` is applied, so the explicit role
      // is a deliberate workaround, not redundancy.
      'jsx-a11y/no-redundant-roles': 'off',
    },
  },

  // Test-file overrides — must come AFTER jsx-a11y so it can relax a11y rules
  // that only apply to render-time components.
  {
    files: [
      '**/__tests__/**/*.ts',
      '**/__tests__/**/*.tsx',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
    ],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Test mocks routinely stub <Link> with a bare <a> — production rendering
      // is what jsx-a11y should actually gate.
      'jsx-a11y/anchor-is-valid': 'off',
    },
  },
)
