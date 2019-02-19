import React, { PureComponent } from 'react'
import PropTypes from 'react-proptypes'

import { withMutations } from 'cozy-client'

import AccountForm from './AccountForm'
import { accountsMutations } from '../connections/accounts'
import { prepareAccountData } from '../helpers/accounts'

/**
 * Encapsulates an AccountForm and create an account with resulting data.
 */
export class AccountCreator extends PureComponent {
  create = async data => {
    const { createAccount, konnector, onCreate, onCreateSuccess } = this.props
    onCreate()
    const account = await createAccount(prepareAccountData(konnector, data))
    onCreateSuccess(account)
  }

  render() {
    const { konnector, submitting } = this.props
    return (
      <AccountForm
        fields={konnector.fields}
        locales={konnector.locales}
        oauth={konnector.oauth}
        onSubmit={this.create}
        submitting={submitting}
      />
    )
  }
}

AccountCreator.propTypes = {
  createAccount: PropTypes.func.isRequired,
  konnector: PropTypes.object.isRequired,
  submitting: PropTypes.bool,
  onCreate: PropTypes.func.isRequired,
  onCreateSuccess: PropTypes.func.isRequired
}

export default withMutations(accountsMutations)(AccountCreator)
