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
      // Block direct DB type imports in UI
      'no-restricted-imports': [
        'warn',
        {
          patterns: [{
            group: ['**/lib/types/database*'],
            message: 'Do not import database types directly in UI layer'
          }]
        }
      ]
    }
  }
];

export default eslintConfig;
