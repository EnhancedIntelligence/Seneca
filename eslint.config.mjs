import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'supabase/.temp/**',
      '**/*.gen.ts',
      '**/*.d.ts',
      'test/**',
      'e2e/**',
      '.ai/**',
      'coverage/**',
      'dist/**'
    ]
  },
  {
    files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
    rules: {
      // Enforce camelCase in UI layer
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'property',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          filter: { regex: '^(aria-.+|data-.+|__html|_.*)', match: false }
        }
      ],
      // Block snake_case in UI components
      'no-restricted-syntax': [
        'warn',
        {
          selector: "MemberExpression[property.name=/.*_.*/]",
          message: 'Use camelCase in app/components; convert in adapters/services.'
        }
      ],
      // Block direct DB type imports in UI and AI imports
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/lib/types/database*'],
              message: 'Do not import database types directly in UI layer'
            },
            {
              group: ['.ai/*', '**/.ai/*'],
              message: 'AI artifacts are reference-only; do not import.'
            }
          ]
        }
      ]
    }
  },
  // API layer - allow snake_case for database fields
  {
    files: ['app/api/**/*.ts'],
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'property',
          format: ['camelCase', 'snake_case', 'UPPER_CASE', 'PascalCase'],
          filter: { regex: '^(aria-.+|data-.+|__html)', match: false }
        }
      ],
      // Disable snake_case warnings in API routes
      'no-restricted-syntax': 'off',
      // Allow unused _ prefixed variables (for unused params)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { 
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true
        }
      ]
    }

  }
];

export default eslintConfig;
