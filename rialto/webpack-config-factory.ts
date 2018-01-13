/* not needed for compilation, just for VS Code intellisense */
/// <reference path="./node_modules/@types/node/index.d.ts"/>
/// <reference path="./node_modules/@types/webpack/index.d.ts"/>

const path = require('path')

//const webpack = require('webpack')

const env = process.env

console.log('Release mode:', !!env.release, '\n')

/**
{Object} WebpackConfigFactoryOptions
{string} buildPath
{string} libName
{libraryTarget} libraryTarget
{boolean} debug
 *
{WebpackConfigFactoryOptions} options
 */
export function createWebpackConfig(options) {

  const libName = options.libName

  const buildPath = path.resolve(options.buildPath)

  console.log('Generating config for library:', libName, 'with options:\n', options, '\n')
  console.log('Resolved build path:', buildPath)

  const baseConfig = {
    devtool: options.debug && !env.release ? 'inline-source-map' : 'source-map',
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
      extensions: ['.ts', '.tsx' /*, '.js'*/]
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/, // /\.tsx?$|\.js$/,
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

  }

  return baseConfig
}

