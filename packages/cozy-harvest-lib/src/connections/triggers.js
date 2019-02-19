import { subscribe } from 'cozy-realtime'

const JOBS_DOCTYPE = 'io.cozy.jobs'
const TRIGGERS_DOCTYPE = 'io.cozy.triggers'

export const triggersMutations = client => {
  /**
   * Create a trigger with given attributes
   * @param  {Object}   attributes
   * @return {Object}   Created trigger
   */
  const createTrigger = async attributes => {
    const { data } = await client
      .collection(TRIGGERS_DOCTYPE)
      .create(attributes)
    return data
  }

  /**
   * Trigger job associated to given trigger
   * @param  {Object}  Trigger to launch
   * @return {Object}  Job document
   */
  const launchTrigger = async trigger => {
    const { data } = await client.collection(TRIGGERS_DOCTYPE).launch(trigger)
    return data
  }

  /**
   * Wait for successful login. For now we are not able to know in real time
   * if the login was succesful or not. So we agree to guess that after a given
   * "login delay", everything worked well. The default login delay
   * is 8 seconds.
   * In the future, the realtime login detection will be detected in this
   * method.
   * @param  {Object}  job               io.cozy.jobs document
   * @param  {Number}  [loginDelay=8000] Delay, in ms, until the login is
   * considered as sucessful.
   * @return {Object}                    The executed job
   */
  const waitForLoginSuccess = async (job, loginDelay = 8000) => {
    const jobSubscription = await subscribe(
      {
        token: client.client.token.token,
        domain: client.client.uri,
        secure: window.location.protocol === 'https:'
      },
      JOBS_DOCTYPE,
      job
    )

    return new Promise(resolve => {
      let fulfilled = false

      const loginTimeout = setTimeout(() => {
        if (!fulfilled) {
          fulfilled = true
          resolve(job)
        }
      }, loginDelay)

      jobSubscription.onUpdate(job => {
        if (!fulfilled) {
          clearTimeout(loginTimeout)
          fulfilled = true
          resolve(job)
        }
      })
    })
  }

  return {
    createTrigger,
    launchTrigger,
    waitForLoginSuccess
  }
}

export default triggersMutations
