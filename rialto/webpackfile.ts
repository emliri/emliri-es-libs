import {createWebpackConfig} from './webpack-config-factory'

const configs = []

{
  const entrySrc = './index.ts'
  const libName = 'rialto'
  const buildPath = 'dist'
  const libraryTarget = 'umd'
  const debug = true

  configs.push(
    createWebpackConfig({
      debug,
      entrySrc,
      libName,
      libraryTarget,
      buildPath
    })
  )
}

export default configs

