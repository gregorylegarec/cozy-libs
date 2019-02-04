/* eslint-env jest */
import React from 'react'
import { configure, shallow } from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'

import { TriggerManager } from 'components/TriggerManager'

configure({ adapter: new Adapter() })

jest.mock('cozy-client', () => ({
  withMutations: () => jest.fn()
}))

const triggersHelper = require('helpers/triggers')
triggersHelper.buildKonnectorCron = jest.fn().mockReturnValue('0 0 0 * * 0')

const fixtures = {
  data: {
    username: 'foo',
    passphrase: 'bar'
  },
  konnector: {
    slug: 'konnectest'
  },
  triggerAttributes: {
    arguments: '0 0 0 * * 0',
    type: '@cron',
    worker: 'konnector',
    worker_arguments: {
      account: 'a87f9a8bd3884479a48811e7b7deec75',
      konnector: 'konnectest'
    }
  },
  createdAccount: {
    _id: 'a87f9a8bd3884479a48811e7b7deec75',
    account_type: 'konnectest',
    auth: {
      username: 'foo',
      passphrase: 'bar'
    }
  },
  createdTrigger: {
    id: '669e9a7cc3064a97bc0aa20feef71cb2',
    _type: 'io.cozy.triggers',
    attributes: {
      arguments: '0 0 0 * * 0',
      type: '@cron',
      worker: 'konnector',
      worker_arguments: {
        account: 'a87f9a8bd3884479a48811e7b7deec75',
        konnector: 'konnectest'
      }
    }
  },
  launchedJob: {
    type: 'io.cozy.jobs',
    id: 'ac09e6f4473f4b6fbb83c9d2f532504e',
    attributes: {
      domain: 'cozy.tools:8080',
      worker: 'konnector',
      state: 'running',
      queued_at: '2016-09-19T12:35:08Z',
      started_at: '2016-09-19T12:35:08Z',
      error: ''
    },
    links: {
      self: '/jobs/ac09e6f4473f4b6fbb83c9d2f532504e'
    }
  },
  runningJob: {
    type: 'io.cozy.jobs',
    id: 'ac09e6f4473f4b6fbb83c9d2f532504e',
    attributes: {
      domain: 'cozy.tools:8080',
      worker: 'konnector',
      state: 'running',
      queued_at: '2016-09-19T12:35:08Z',
      started_at: '2016-09-19T12:35:08Z',
      error: ''
    },
    links: {
      self: '/jobs/ac09e6f4473f4b6fbb83c9d2f532504e'
    }
  }
}

const createAccountMock = jest.fn().mockResolvedValue(fixtures.createdAccount)
const createTriggerMock = jest.fn().mockResolvedValue(fixtures.createdTrigger)
const launchTriggerMock = jest.fn().mockResolvedValue(fixtures.launchedJob)
const waitForLoginSuccessMock = jest.fn().mockResolvedValue(fixtures.runningJob)

const onDoneMock = jest.fn()

describe('TriggerManager', () => {
  beforeEach(() => {
    createAccountMock.mockClear()
    createTriggerMock.mockClear()
    launchTriggerMock.mockClear()
    onDoneMock.mockClear()
    waitForLoginSuccessMock.mockClear()
  })

  it('should render', () => {
    const component = shallow(
      <TriggerManager
        createAccount={createAccountMock}
        konnector={fixtures.konnector}
        onDone={onDoneMock}
      />
    ).getElement()
    expect(component).toMatchSnapshot()
  })

  it('should pass account auth values', () => {
    const account = {
      auth: {
        username: 'foo',
        passphrase: 'bar'
      }
    }
    const component = shallow(
      <TriggerManager
        account={account}
        createAccount={createAccountMock}
        konnector={fixtures.konnector}
        onDone={onDoneMock}
      />
    ).getElement()
    expect(component).toMatchSnapshot()
  })

  it('should pass oauth values', () => {
    const account = {
      oauth: {
        accessToken: 'abcdef12345'
      }
    }

    const component = shallow(
      <TriggerManager
        account={account}
        createAccount={createAccountMock}
        konnector={fixtures.konnector}
        onDone={onDoneMock}
      />
    ).getElement()
    expect(component).toMatchSnapshot()
  })

  it('should call createAccount on submit', () => {
    const wrapper = shallow(
      <TriggerManager
        createAccount={createAccountMock}
        konnector={fixtures.konnector}
        onDone={onDoneMock}
      />
    )

    wrapper.instance().onSubmit(fixtures.data)

    expect(createAccountMock).toHaveBeenCalledWith({
      account_type: 'konnectest',
      auth: {
        username: 'foo',
        passphrase: 'bar'
      }
    })
  })

  it('should call createTrigger on submit', async () => {
    const wrapper = shallow(
      <TriggerManager
        createAccount={createAccountMock}
        createTrigger={createTriggerMock}
        launchTrigger={launchTriggerMock}
        konnector={fixtures.konnector}
        onDone={onDoneMock}
        waitForLoginSuccess={waitForLoginSuccessMock}
      />
    )

    await wrapper.instance().onSubmit(fixtures.data)

    expect(createTriggerMock).toHaveBeenCalledWith(fixtures.triggerAttributes)
  })

  it('should call launchTrigger on submit', async () => {
    const wrapper = shallow(
      <TriggerManager
        createAccount={createAccountMock}
        createTrigger={createTriggerMock}
        launchTrigger={launchTriggerMock}
        konnector={fixtures.konnector}
        onDone={onDoneMock}
        waitForLoginSuccess={waitForLoginSuccessMock}
      />
    )

    await wrapper.instance().onSubmit(fixtures.data)

    expect(launchTriggerMock).toHaveBeenCalledWith(fixtures.createdTrigger)
  })

  it('should call waitForLoginSuccess on submit', async () => {
    const wrapper = shallow(
      <KonnectorManager
        createAccount={createAccountMock}
        createTrigger={createTriggerMock}
        launchTrigger={launchTriggerMock}
        konnector={fixtures.konnector}
        onDone={onDoneMock}
        waitForLoginSuccess={waitForLoginSuccessMock}
      />
    )

    await wrapper.instance().onSubmit(fixtures.data)

    expect(waitForLoginSuccessMock).toHaveBeenCalledWith(fixtures.launchedJob)
  })

  it('should update state on submit', () => {
    const wrapper = shallow(
      <TriggerManager
        createAccount={createAccountMock}
        konnector={fixtures.konnector}
        onDone={onDoneMock}
      />
    )

    wrapper.instance().onSubmit(fixtures.data)

    expect(wrapper.state().status).toBe('CREATING')
  })

  it('should render as expected after submit success', async () => {
    const wrapper = shallow(
      <TriggerManager
        createAccount={createAccountMock}
        createTrigger={createTriggerMock}
        konnector={fixtures.konnector}
        launchTrigger={launchTriggerMock}
        onDone={onDoneMock}
        waitForLoginSuccess={waitForLoginSuccessMock}
      />
    )

    await wrapper.instance().onSubmit(fixtures.data)
    const component = wrapper.getElement()

    expect(wrapper.state().status).toBe('CREATION_SUCCESS')
    expect(component).toMatchSnapshot()
  })
})
