import {terser} from 'rollup-plugin-terser'

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/worker-dispatcher.cjs.js',
      format: 'cjs'
    },
    {
      file: 'dist/worker-dispatcher.esm.js',
      format: 'esm'
    },
    {
      file: 'dist/worker-dispatcher.umd.js',
      format: 'umd',
      name: 'worker-dispatcher'
    },
    {
      file: 'dist/worker-dispatcher.iife.min.js',
      format: 'iife',
      name: 'version',
      plugins: [
				terser({
					output: {
						comments: false
					}
				})
			]
    },
    {
      file: 'example/worker-dispatcher.js',
      format: 'esm'
    }
  ]
}
