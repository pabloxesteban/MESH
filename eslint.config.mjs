// Configuración de ESLint de MESH.
//
// Más allá de las reglas de corrección habituales, este archivo impone tres
// límites arquitectónicos que la revisión de código no puede sostener sola.
// Ver docs/decisions/ADR-008-design-system.md y
// docs/architecture/system-architecture.md §3.
//
//   1. Ningún valor de diseño crudo fuera de src/design-system/
//   2. Las pantallas no hablan con Supabase
//   3. packages/domain se mantiene puro (sin react, sin react-native, sin supabase)

import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/** Propiedades de estilo cuyo valor numérico crudo es un error. */
const SPACING_PROPS = [
  'padding',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'paddingHorizontal',
  'paddingVertical',
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginHorizontal',
  'marginVertical',
  'gap',
  'rowGap',
  'columnGap',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderWidth',
  'fontSize',
  'lineHeight',
  'letterSpacing',
  'duration',
  'damping',
  'stiffness',
].join('|')

const DESIGN_VALUE_RULES = [
  {
    // #fff, #0C0C0E, #0C0C0EFF
    selector:
      'Literal[value=/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
    message:
      'Nada de colores hex fuera del design system. Importá un token semántico ' +
      '(ej. theme.colors.textPrimary). Ver ADR-008.',
  },
  {
    // rgb(), rgba(), hsl()
    selector: 'Literal[value=/^(?:rgba?|hsla?)\\(/]',
    message:
      'Nada de colores literales fuera del design system. Importá un token ' +
      'semántico. Ver ADR-008.',
  },
  {
    // { padding: 24 }, { duration: 340 }
    selector: `Property[key.name=/^(?:${SPACING_PROPS})$/] > Literal[raw=/^[0-9]/]`,
    message:
      'Nada de espaciados, radios, tamaños de fuente ni duraciones numéricos ' +
      'fuera del design system. Usá un token (spacing.lg, motion.standard). ' +
      'Ver ADR-008.',
  },
]

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.expo/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/*.d.ts',
      'apps/mobile/expo-env.d.ts',
      'supabase/.temp/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.es2023 },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // ---------------------------------------------------------------------------
  // 1. packages/domain se mantiene puro.
  //    Es la razón por la que los motores de gusto y matching se pueden testear
  //    sin simulador y reutilizar desde el seeder. Ver ADR-001.
  // ---------------------------------------------------------------------------
  {
    files: ['packages/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react/*',
                'react-native',
                'react-native/*',
                'react-native-*',
                'expo',
                'expo-*',
                '@supabase/*',
                '@react-navigation/*',
              ],
              message:
                'packages/domain es TypeScript puro. Nada de react, ' +
                'react-native, expo ni supabase acá — si lo necesita, la lógica ' +
                'va en apps/mobile. Ver ADR-001.',
            },
          ],
        },
      ],
      // El matching tiene que ser determinístico: nada de reloj ni de azar.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message:
            'El motor de matching es determinístico. Nada de Math.random(). ' +
            'Ver docs/product/matching.md §1.',
        },
        {
          selector:
            "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message:
            'Nada de lecturas de reloj dentro del scoring — rompe el ' +
            'determinismo y la testeabilidad. Pasá el instante como parámetro. ' +
            'Ver docs/product/matching.md §1.',
        },
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message:
            'Nada de new Date() sin argumento dentro del dominio. Pasá el ' +
            'instante como parámetro. Ver docs/product/matching.md §1.',
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // 2. Nada de valores de diseño crudos fuera del design system.
  // ---------------------------------------------------------------------------
  {
    files: ['apps/mobile/**/*.{ts,tsx}'],
    ignores: ['apps/mobile/src/design-system/**'],
    rules: {
      'no-restricted-syntax': ['error', ...DESIGN_VALUE_RULES],
    },
  },

  // ---------------------------------------------------------------------------
  // 3. Las pantallas son composición. No hablan con Supabase.
  //    Las consultas viven en features/<x>/queries.ts.
  // ---------------------------------------------------------------------------
  {
    files: ['apps/mobile/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@supabase/*', '**/data/supabase', '**/data/supabase*'],
              message:
                'Las pantallas no consultan la base. Poné la consulta en ' +
                'features/<x>/queries.ts y usá su hook. Ver ' +
                'docs/architecture/system-architecture.md §3.',
            },
          ],
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // El design system y las herramientas pueden hacer lo que las pantallas no.
  // ---------------------------------------------------------------------------
  {
    files: ['apps/mobile/src/design-system/**/*.{ts,tsx}'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['tools/**/*.{ts,mjs}', 'scripts/**/*.mjs', '*.mjs'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-console': 'off' },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/__fixtures__/**'],
    rules: { 'no-restricted-syntax': 'off' },
  },
)
