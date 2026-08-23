import nextVitals from 'eslint-config-next/core-web-vitals'

export default [
  ...nextVitals,
  {
    ignores: ['infra/tests/fixtures/**'],
  },
  {
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]
