import React, { Component } from 'react'
import PropTypes from 'react-proptypes'

import { withMutations } from 'cozy-client'

import AccountCreator from './AccountCreator'
import AccountEditor from './AccountEditor'
import TriggerSuccessMessage from './TriggerSuccessMessage'
import { triggersMutations } from '../connections/triggers'
import {
  buildKonnectorCron,
  buildKonnectorTriggerAttributes
} from '../helpers/triggers'

const IDLE = 'IDLE'
const RUNNING = 'RUNNING'
const LOGGED = 'LOGGED'
const SUCCESS = 'SUCCESS'

/**
 * Deals with konnector configuration, i.e encapsulate account creation or
 * edition
 * @type {Component}
 */
export class TriggerManager extends Component {
  state = {
    status: IDLE
  }

  /**
   * Creation/update start handler
   * Set the status to RUNNING as soon as an account is being created
   * or updated.
   */
  handleAccountMutation = () =>
    this.setState({
      status: RUNNING
    })

  /**
   * Account creation success handler
   * @param  {Object}  account Created io.cozy.accounts document
   * @return {Object}          io.cozy.jobs document, runned with account data
   */
  handleTriggerSuccessMessage = async account => {
    const { createTrigger, konnector } = this.props

    const trigger = await createTrigger(
      buildKonnectorTriggerAttributes({
        konnector,
        account,
        cron: buildKonnectorCron(konnector)
      })
    )

    return await this.launch(trigger)
  }

  /**
   * Account update success handler
   * @param  {Object}  account Updated io.cozy.accounts document
   * @return {Object}          io.cozy.jobs document, runned with account data
   */
  handleAccountUpdateSuccess = async account => {
    this.setState({
      updatedAccount: account
    })

    const { trigger } = this.props
    return await this.launch(trigger)
  }

  /**
   * Launches a trigger
   * @param  {Object}  trigger io.cozy.triggers document
   * @return {Promise}         [description]
   */
  launch = async trigger => {
    const { launchTrigger, onLoginSuccess, waitForLoginSuccess } = this.props

    const job = await waitForLoginSuccess(await launchTrigger(trigger))

    if (['queued', 'running'].includes(job.state)) {
      onLoginSuccess(trigger)
    }

    this.setState({
      status: SUCCESS
    })
  }

  render() {
    const { account, konnector, onDone } = this.props
    const { status, updatedAccount } = this.state
    const succeed = [LOGGED, SUCCESS].includes(status)
    const submitting = status === RUNNING

    return account ? (
      <AccountEditor
        account={updatedAccount || account}
        konnector={konnector}
        onUpdate={this.handleAccountMutation}
        onUpdateSuccess={this.handleAccountUpdateSuccess}
        submitting={submitting}
      />
    ) : succeed ? (
      <TriggerSuccessMessage onDone={onDone} />
    ) : (
      <AccountCreator
        konnector={konnector}
        onCreate={this.handleAccountMutation}
        onCreateSuccess={this.handleTriggerSuccessMessage}
        submitting={submitting}
      />
    )
  }
}

TriggerManager.propTypes = {
  account: PropTypes.object,
  createTrigger: PropTypes.func.isRequired,
  konnector: PropTypes.object.isRequired,
  launchTrigger: PropTypes.func.isRequired,
  onDone: PropTypes.func.isRequired,
  onLoginSuccess: PropTypes.func.isRequired,
  trigger: PropTypes.object,
  waitForLoginSuccess: PropTypes.func.isRequired
}

export default withMutations(triggersMutations)(TriggerManager)
