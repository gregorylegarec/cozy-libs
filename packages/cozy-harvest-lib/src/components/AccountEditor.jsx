import React, { PureComponent } from 'react'
import PropTypes from 'react-proptypes'

import { withMutations } from 'cozy-client'

import AccountForm from './AccountForm'
import { accountsMutations } from '../connections/accounts'
import { hydrateAccount } from '../helpers/accounts'

/**
 * Encapsulates an AccocuntForm of an existing account, and allow to update it.
 */
export class AccountEditor extends PureComponent {
  update = async data => {
    const { account, onUpdate, onUpdateSuccess, updateAccount } = this.props
    onUpdate()
    const updatedAccount = await updateAccount(hydrateAccount(account, data))
    console.debug({ updatedAccount })
    onUpdateSuccess(updatedAccount)
  }

  render() {
    const { account, konnector, submitting } = this.props
    console.debug('AcconutEditor.render', { account })
    return (
      <AccountForm
        fields={konnector.fields}
        initialValues={account && (account.auth || account.oauth)}
        locales={konnector.locales}
        oauth={konnector.oauth}
        onSubmit={this.update}
        submitting={submitting}
      />
    )
  }
}

AccountEditor.propTypes = {
  account: PropTypes.object,
  createAccount: PropTypes.func.isRequired,
  konnector: PropTypes.object.isRequired,
  submitting: PropTypes.bool,
  onUpdate: PropTypes.func.isRequired,
  onUpdateSuccess: PropTypes.func.isRequired
}

export default withMutations(accountsMutations)(AccountEditor)
