// Stops `npm run dev` early with a clear message when packages are missing,
// for example after pulling changes that added a dependency.
const fs = require('fs')
const path = require('path')

const pkg = require('../package.json')
const wanted = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })
const missing = wanted.filter((name) => !fs.existsSync(path.join(__dirname, '..', 'node_modules', name, 'package.json')))

if (missing.length > 0) {
  console.error(`\n${missing.length} package(s) are not installed yet (${missing.slice(0, 4).join(', ')}${missing.length > 4 ? ', …' : ''}).`)
  console.error('Run this first, then try again:\n\n    npm install\n')
  process.exit(1)
}
