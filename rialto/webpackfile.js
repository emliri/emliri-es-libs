const webpackConfigFactory = require('../webpack-config-factory')

const entrySrc = './index.ts';
const libName = 'rialto';
const buildPath = 'dist';
const libraryTarget = 'umd';
const debug = true;

module.exports = webpackConfigFactory.create({
    debug,
    entrySrc,
    libName,
    libraryTarget,
    buildPath
});


