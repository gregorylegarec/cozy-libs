/* eslint-env jest */

import { buildAttributes } from 'helpers/triggers'

describe('Triggers Helper', () => {
  describe('buildAttributes', () => {
    const konnector = { slug: 'konnectest' }
    const account = { _id: '963a51f6cdd34401b0904de32cc5578d' }

    it('build attributes', () => {
      expect(buildAttributes({ konnector, account })).toEqual({
        arguments: '0 0 0 * * 0',
        type: '@cron',
        worker: 'konnector',
        message: {
          account: '963a51f6cdd34401b0904de32cc5578d',
          konnector: 'konnectest'
        }
      })
    })

    it('build attributes with cron', () => {
      const cron = '0 0 0 * * 2'
      expect(buildAttributes({ konnector, account, cron })).toEqual({
        arguments: '0 0 0 * * 2',
        type: '@cron',
        worker: 'konnector',
        message: {
          account: '963a51f6cdd34401b0904de32cc5578d',
          konnector: 'konnectest'
        }
      })
    })

    it('build attributes with folder', () => {
      const folder = { _id: '4c43f8e88e5f4a608667da6b5bae8fa4' }
      expect(buildAttributes({ konnector, account, folder })).toEqual({
        arguments: '0 0 0 * * 0',
        type: '@cron',
        worker: 'konnector',
        message: {
          account: '963a51f6cdd34401b0904de32cc5578d',
          folder_to_save: '4c43f8e88e5f4a608667da6b5bae8fa4',
          konnector: 'konnectest'
        }
      })
    })
  })
})
