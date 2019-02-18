/**
 * Transform AccountForm data to io.cozy.accounts attributes
 * @param  {object} konnector Konnector related to account
 * @param  {object} data      Data from AccountForm
 * @return {object}           io.cozy.accounts attributes
 */
export const prepareAccountData = (konnector, data) => {
  // We are not at the final target for io.cozy.accounts.
  // For now we are just ensuring legacy
  return {
    auth: data,
    account_type: konnector.slug
  }
}

/**
 * Hydrate existing io.cozy.accounts attributes with AccountForm data
 * @param  {object} account   io.cozy.accounts document
 * @param  {object} data      Data from AccountForm
 * @return {object}           io.cozy.accounts attributes
 */
export const hydrateAccount = (account, data) => {
  const auth = { ...account.auth, ...data }
  return { ...account, auth }
}
