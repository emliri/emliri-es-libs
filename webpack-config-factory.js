const path = require('path');

/**
 * @typedef {Object} WebpackConfigFactoryOptions
 * @prop {string} buildPath
 * @prop {string} libName
 * @prop {libraryTarget} libraryTarget
 * @prop {boolean} debug
 *
 *
 * @param {WebpackConfigFactoryOptions} options
 */
function create(options) {

  const libName = options.libName;

  const buildPath = path.resolve(options.buildPath);

  console.log('Generating config for library:', libName, 'with options:\n', options, '\n');
  console.log('Resolved build path:', buildPath);

  const baseConfig = {
      devtool: options.debug ? 'inline-source-map' : 'source-map',
      entry: options.entrySrc,
      externals: options.externals,
      output: {
        path: buildPath,
        publicPath: '/' + options.buildPath + '/',
        filename: libName + '.' + options.libraryTarget + '.js',
        library: libName,
        libraryTarget: options.libraryTarget,
        sourceMapFilename: '[file].map'
      },
      resolve: {
        // Add `.ts` and `.tsx` as a resolvable extension.
        extensions: ['.ts', '.tsx', '.js']
      },
      module: {
        rules: [
          {
            test: /\.tsx?$|\.js$/,
            exclude: /(node_modules|bower_components)/,
            use: {
                loader: 'ts-loader'
            }
          }
        ]
      },
      plugins: [
      /*
          new Visualizer({
              filename: '../build_statistics.html'
          })
      */
      ]

  };

  return baseConfig;
}

module.exports = {
  create
}
