/* eslint-env jest */

import {
  buildCron,
  buildKonnectorCron,
  buildKonnectorTriggerAttributes
} from 'helpers/triggers'

describe('Triggers Helper', () => {
  describe('buildKonnectorTriggerAttributes', () => {
    const konnector = { slug: 'konnectest' }
    const account = { _id: '963a51f6cdd34401b0904de32cc5578d' }

    it('build attributes', () => {
      expect(buildKonnectorTriggerAttributes({ konnector, account })).toEqual({
        arguments: '0 0 0 * * 0',
        type: '@cron',
        worker: 'konnector',
        worker_arguments: {
          account: '963a51f6cdd34401b0904de32cc5578d',
          konnector: 'konnectest'
        }
      })
    })

    it('build attributes with cron', () => {
      const cron = '0 0 0 * * 2'
      expect(
        buildKonnectorTriggerAttributes({ konnector, account, cron })
      ).toEqual({
        arguments: '0 0 0 * * 2',
        type: '@cron',
        worker: 'konnector',
        worker_arguments: {
          account: '963a51f6cdd34401b0904de32cc5578d',
          konnector: 'konnectest'
        }
      })
    })
  })

  describe('buildCron', () => {
    const options = {
      dayOfMonth: 25,
      dayOfWeek: 4,
      hours: 14,
      minutes: 15
    }

    it('creates default cron (weekly)', () => {
      expect(buildCron()).toEqual('0 0 0 * * 1')
    })

    it('creates weekly cron', () => {
      expect(buildCron('weekly', options)).toEqual('0 15 14 * * 4')
    })

    it('creates monthly cron', () => {
      expect(buildCron('monthly', options)).toEqual('0 15 14 25 * *')
    })

    it('creates daily cron', () => {
      expect(buildCron('daily', options)).toEqual('0 15 14 * * *')
    })

    it('creates hourly cron', () => {
      expect(buildCron('hourly', options)).toEqual('0 15 * * * *')
    })
  })

  describe('buildKonnectorCron', () => {
    const randomDayTimeMock = jest.fn()

    beforeEach(() => {
      randomDayTimeMock.mockImplementation((min, max) => ({
        hours: max - 1,
        minutes: 59
      }))
    })

    afterEach(() => {
      randomDayTimeMock.mockReset()
    })

    it('returns expected default cron', () => {
      const konnector = {}
      const date = new Date('2019-02-07T14:12:00')
      expect(buildKonnectorCron(konnector, date, randomDayTimeMock)).toEqual(
        `0 59 4 * * 4`
      )
    })

    it('returns expected monthly cron', () => {
      const konnector = {
        frequency: 'monthly'
      }
      const date = new Date('2019-02-07T14:12:00')
      expect(buildKonnectorCron(konnector, date, randomDayTimeMock)).toEqual(
        `0 59 4 7 * *`
      )
    })

    it('returns expected cron with time interval', () => {
      const konnector = {
        time_interval: [0, 12]
      }
      const date = new Date('2019-02-07T14:12:00')
      expect(buildKonnectorCron(konnector, date, randomDayTimeMock)).toEqual(
        `0 59 11 * * 4`
      )
    })
  })
})
