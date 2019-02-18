import { prepareAccountData } from 'helpers/accounts'

describe('Accounts Helper', () => {
  describe('prepareAccountData', () => {
    it('should prepare account data', () => {
      const konnector = {
        slug: 'testnector'
      }

      const data = {
        username: 'toto',
        passphrase: 'tata'
      }

      expect(prepareAccountData(konnector, data)).toEqual({
        account_type: 'testnector',
        auth: {
          username: 'toto',
          passphrase: 'tata'
        }
      })
    })
  })
})
