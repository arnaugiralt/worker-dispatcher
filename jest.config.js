module.exports = {
	verbose: true,
	collectCoverage: true,
	preset: 'rollup-jest',
	coverageDirectory: './test/coverage',
	setupFiles: [ './test/setup/jest-setup.js']
}
