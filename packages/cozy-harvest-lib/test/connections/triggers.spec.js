/* eslint-env jest */
import client from 'cozy-client'

jest.mock('cozy-client', () => ({
  collection: jest.fn().mockReturnValue({
    launch: jest.fn()
  }),
  create: jest.fn()
}))

import { triggersMutations } from 'connections/triggers'
const { createTrigger, launchTrigger } = triggersMutations(client)

describe('Trigger mutations', () => {
  beforeEach(() => {
    client.create.mockReset()
    client.collection().launch.mockReset()
  })

  describe('createTrigger', () => {
    it('calls Cozy Client and return trigger', async () => {
      const trigger = {
        id: '42817ec169d047e68b912c6f7d7564a2'
      }

      const createdTrigger = {
        _type: 'io.cozy.triggers',
        id: '42817ec169d047e68b912c6f7d7564a2'
      }

      client.create.mockResolvedValue({ data: createdTrigger })

      const result = await createTrigger(trigger)

      expect(client.create).toHaveBeenCalledWith('io.cozy.triggers', trigger)
      expect(result).toEqual(createdTrigger)
    })
  })

  describe('launchTrigger', () => {
    it('calls expected endpoint', async () => {
      const trigger = {
        id: '37cd4289dd2543629b956dc68c15c022'
      }

      const launchedJob = {
        _type: 'io.cozy.jobs',
        id: '2794bb7c3cd64712a427ca4454aef238'
      }

      client.collection().launch.mockReturnValue({ data: launchedJob })

      const result = await launchTrigger(trigger)
      expect(client.collection().launch).toHaveBeenCalledWith(trigger)
      expect(result).toEqual(launchedJob)
    })
  })
})
