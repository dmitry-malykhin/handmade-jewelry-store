export default {
  // TypeScript and React files — lint then format
  '**/*.{ts,tsx}': ['eslint --fix --max-warnings=0', 'prettier --write'],
  // Everything else — format only
  '**/*.{js,mjs,json,md,yaml,yml}': ['prettier --write'],
}
