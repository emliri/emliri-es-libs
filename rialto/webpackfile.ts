import {createWebpackConfig} from './webpack-config-factory'

const configs = []

// Library
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

// Demo
{
  const entrySrc = './demo/main.ts'
  const libName = 'rialtoDemo'
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

