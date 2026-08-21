import antfu from '@antfu/eslint-config';

export default antfu(
  {
    typescript: true,
    stylistic: false,
    type: 'lib',
  },
  {
    name: 'hikarisoft/rewrite',
    rules: {
      'antfu/curly': 'off',
      'antfu/if-newline': 'off',
      'antfu/top-level-function': 'off',
      'no-console': 'warn',
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  {
    name: 'hikarisoft/sort',
    rules: {
      'perfectionist/sort-array-includes': [
        'error',
        {
          order: 'asc',
          type: 'alphabetical',
        },
      ],
      'perfectionist/sort-union-types': [
        'error',
        {
          groups: [
            'conditional',
            'function',
            'import',
            'intersection',
            'keyword',
            'literal',
            'named',
            'object',
            'operator',
            'tuple',
            'union',
            'nullish',
          ],
          order: 'asc',
          specialCharacters: 'keep',
          type: 'alphabetical',
        },
      ],
    },
  },
);
