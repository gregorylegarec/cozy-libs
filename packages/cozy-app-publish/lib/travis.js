const path = require('path')
const publish = require('./publish')
const postpublish = require('./postpublish')
const prepublish = require('./prepublish')
const colorize = require('../utils/colorize')
const getManifestAsObject = require('../utils/getManifestAsObject')
const getTravisVariables = require('../utils/getTravisVariables')
const constants = require('./constants')
const { getDevVersion } = require('./tags')

const { DEFAULT_REGISTRY_URL, DEFAULT_BUILD_DIR } = constants

const getAutoTravisVersion = async appManifestObj => {
  const { TRAVIS_TAG, TRAVIS_COMMIT } = getTravisVariables()
  if (TRAVIS_TAG) {
    return TRAVIS_TAG
  } else {
    const shortCommit = TRAVIS_COMMIT.slice(0, 7)
    return await getDevVersion(shortCommit, appManifestObj.version)
  }
}

async function travisPublish({
  postpublishHook,
  prepublishHook,
  registryToken,
  buildDir = DEFAULT_BUILD_DIR,
  buildCommit,
  buildUrl,
  registryUrl = DEFAULT_REGISTRY_URL,
  spaceName
}) {
  const {
    TRAVIS_BUILD_DIR,
    TRAVIS_TAG,
    TRAVIS_COMMIT,
    TRAVIS_REPO_SLUG,
    // encrypted variables
    REGISTRY_TOKEN
  } = getTravisVariables()

  // registry editor token (required)
  registryToken = registryToken || REGISTRY_TOKEN
  if (!registryToken) {
    throw new Error('Registry token is missing. Publishing failed.')
  }

  // application manifest (required)
  const appManifestObj = getManifestAsObject(
    path.join(TRAVIS_BUILD_DIR, buildDir)
  )

  // registry editor (required)
  const registryEditor = appManifestObj.editor
  if (!registryEditor) {
    throw new Error(
      'Registry editor is missing in the manifest. Publishing failed.'
    )
  }

  // other variables
  const appSlug = appManifestObj.slug
  const appType = appManifestObj.type

  // get application version to publish
  const appVersion = await getAutoTravisVersion(appManifestObj)

  // get archive url from github repo
  // FIXME push directly the archive to the registry
  // for now, the registry needs an external URL
  let appBuildUrl = ''
  const githubUrl = `https://github.com/${TRAVIS_REPO_SLUG}/archive`
  const buildHash = buildCommit || TRAVIS_COMMIT
  if (buildUrl) {
    appBuildUrl = buildUrl
  } else if (!buildCommit && TRAVIS_TAG) {
    // if we use --build-commit => we are not on the build branch
    // so we can't use this branch tag directly for the url
    // if not, we suppose that we are on the build tagged branch here
    appBuildUrl = `${githubUrl}/${TRAVIS_TAG}.tar.gz`
  } else {
    appBuildUrl = `${githubUrl}/${buildHash}.tar.gz`
  }

  let publishOptions
  try {
    publishOptions = await prepublish({
      prepublishHook,
      registryUrl,
      registryEditor,
      registryToken,
      spaceName,
      appSlug,
      appVersion,
      appBuildUrl,
      appType
    })
  } catch (error) {
    throw new Error(`Prepublish failed: ${error.message}`)
  }

  // publish the application on the registry
  console.log(
    colorize.blue(
      `Publishing ${publishOptions.appSlug} (version ${
        publishOptions.appVersion
      }) from ${publishOptions.appBuildUrl} (${publishOptions.sha256Sum}) to ${
        publishOptions.registryUrl
      } (space: ${publishOptions.spaceName || 'default one'})`
    )
  )

  try {
    await publish(publishOptions)
  } catch (error) {
    throw new Error(`Publish failed: ${error.message}`)
  }

  try {
    await postpublish({ ...publishOptions, postpublishHook })
  } catch (error) {
    throw new Error(`Postpublish hooks failed: ${error.message}`)
  }
}

module.exports = travisPublish
