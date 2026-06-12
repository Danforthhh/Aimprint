import { build } from 'esbuild'

await build({
  entryPoints: ['index.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: 'dist/index.js',
})

console.log('Built dist/index.js')
