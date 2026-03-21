// @ts-check
import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'

export default tseslint.config(
  // ── Ignore patterns ──────────────────────────────────────────────────────────
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

  // ── TypeScript recommended rules ─────────────────────────────────────────────
  ...tseslint.configs.recommended,

  // ── Prettier compatibility — must be last ─────────────────────────────────────
  prettierConfig,

  // ── Project-specific rules (from CODE_RULES.docx) ─────────────────────────────
  {
    rules: {
      // Enforce explicit types — no 'any' allowed (CODE_RULES §2)
      '@typescript-eslint/no-explicit-any': 'error',

      // Unused vars allowed only with underscore prefix (_varName)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Prefer 'type' imports for TypeScript types
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // Allow implicit return types (too noisy for React components)
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // Allow non-null assertions when developer is confident
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },
)
