/* global WebSocket */
import pick from 'lodash/pick'
import pickBy from 'lodash/pickBy'

import { subscribe as subscribeLegacy } from './legacy'
import RealtimeSubscriptions from './RealtimeSubscriptions'

// const NUM_RETRIES = 3
// const RETRY_BASE_DELAY = 1000

function isSecureURL(url) {
  const httpsRegexp = new RegExp(`^(https:/{2})`)
  return url.match(httpsRegexp)
}

const isBoolean = [
  bool => typeof bool === 'undefined' || typeof bool === 'boolean',
  'should be a boolean'
]
const isRequired = [attr => !!attr, 'is required']
const isRequiredIfNo = keys => [
  (attr, obj) => keys.find(key => !!obj[key]) || !!attr,
  `is required if no attribute ${keys.join(' or ')} are provider.`
]
const isString = [
  str => typeof str === 'undefined' || typeof str === 'string',
  'should be a string'
]
const isURL = [
  url => {
    if (typeof url === 'undefined') return true
    try {
      new URL(url)
    } catch (error) {
      return false
    }

    return true
  },
  'should be an URL'
]

const validate = types => obj => {
  for (const [attr, rules] of Object.entries(types)) {
    for (const [validator, message] of rules) {
      if (!validator(obj[attr], obj)) {
        throw new Error(`${attr} ${message}.`)
      }
    }
  }
}

const configTypes = {
  domain: [isRequiredIfNo(['url']), isString],
  secure: [isBoolean],
  token: [isRequired, isString],
  url: [isRequiredIfNo(['domain']), isURL]
}

const validateConfig = validate(configTypes)

// async function createWebSocket(
//   config,
//   onmessage,
//   onclose,
//   numRetries,
//   retryDelay
// ) {
//   const options = {
//     secure: config.url ? isSecureURL(config.url) : true,
//     ...config
//   }
//
//   const protocol = options.secure ? 'wss:' : 'ws:'
//   const domain = options.domain || new URL(options.url).host
//
//   if (!domain) {
//     throw new Error('Unable to detect domain')
//   }
//
//   const socket = new WebSocket(
//     `${protocol}//${domain}/realtime/`,
//     'io.cozy.websocket'
//   )
//
//   const windowUnloadHandler = () => socket.close()
//   window.addEventListener('beforeunload', windowUnloadHandler)
//
//   socket.onmessage = onmessage
//   socket.onclose = event => {
//     window.removeEventListener('beforeunload', windowUnloadHandler)
//     if (typeof onclose === 'function') onclose(event, numRetries, retryDelay)
//   }
//
//   return new Promise(resolve => {
//     socket.onopen = () => {
//       socket.send(
//         JSON.stringify({
//           method: 'AUTH',
//           payload: options.token
//         })
//       )
//       resolve(socket)
//     }
//   })
// }

const onSocketClose = event => {
  //}, numRetries, retryDelay) => {
  if (!event.wasClean) {
    console.warn(
      `WebSocket closed unexpectedly with code ${event.code} and ${
        event.reason ? `reason: '${event.reason}'` : 'no reason'
      }.`
    )

    // if (numRetries) {
    //   console.warn(`Reconnecting ... ${numRetries} tries left.`)
    //   setTimeout(() => {
    //     try {
    //       createWebSocket(
    //         config,
    //         onSocketMessage,
    //         onSocketClose,
    //         --numRetries,
    //         retryDelay + 1000
    //       )
    //       // retry
    //       if (listeners.size) {
    //         listeners.forEach((value, listenerKey) => {
    //           const { doctype, docId } = getTypeAndIdFromListenerKey(
    //             listenerKey
    //           )
    //         })
    //       }
    //     } catch (error) {
    //       console.error(
    //         `Unable to reconnect to realtime. Error: ${error.message}`
    //       )
    //     }
    //   }, retryDelay)
    // } else {
    //   console.error(`0 tries left. Stop reconnecting realtime.`)
    //   // remove cached socket and promise
    //   if (cozySocket) cozySocket = null
    // }
  }
}

export class CozyRealtime {
  subscriptions = new RealtimeSubscriptions()

  /**
   * Log were subcribe messages sent are recored
   * @type {Array}
   */
  _log = []

  /**
   * Open a WebSocket
   * @constructor
   * @param {String}  domain        The cozy domain
   * @param {Boolean} [secure=true] Indicates either the WebSocket should be
   * secure or not
   * @param {String}  token         The Application token
   * @param {String}  url           URL of the cozy. Can be used in place of
   * domain and secure parameters
   */
  constructor({ domain, secure = true, token, url }) {
    validateConfig({ domain, secure, token, url })

    this._domain = domain
    this._secure = url ? isSecureURL(url) : secure
    this._token = token
    this._url = url

    this._socketPromise = this._connect()
    this._subscriptions = new RealtimeSubscriptions()
  }

  /**
   * Returns an instance of CozyRealtime. Can be used instead of
   * `new CozyRealtime`.
   * @static
   * @param  {Object} options Object containing domain, secure, token and url
   * parameters
   * @return {CozyRealtime}         CozyRealtime instance
   */
  static init(options) {
    return new CozyRealtime(options)
  }

  subscribe({ type, id }, eventName, handler) {
    if (typeof handler !== 'function')
      throw new Error('Realtime event handler must be a function')

    this._subscriptions.addHandler({ type, id }, eventName, handler)

    return this._sendSubscribeMessage({ type, id })
  }

  unsubscribe({ type, id }, eventName, handler) {
    this._subscriptions.removeHandler({ type, id }, eventName, handler)
  }

  /**
   * Establish a realtime connection
   * @return {Promise} Promise of the opened websocket
   */
  _connect() {
    return new Promise(resolve => {
      const protocol = this._secure ? 'wss:' : 'ws:'
      const socket = new WebSocket(
        `${protocol}//${this._domain}/realtime/`,
        'io.cozy.websocket'
      )

      const windowUnloadHandler = () => socket.close()
      window.addEventListener('beforeunload', windowUnloadHandler)

      socket.onmessage = this._handleSocketMessage.bind(this)
      socket.onclose = this._handleSocketClose.bind(this)
      socket.onerror = this._handleSocketError.bind(this)
      socket.onopen = () => {
        this._handleSocketOpen(socket)
        resolve(socket)
      }
    })
  }

  /**
   * Handles a socket closing
   * @param  {CloseEvent} event
   */
  _handleSocketClose(event) {
    // Set to null to know that it is not available anymore.
    this._socketPromise = null
    this._stopListenningUnload()
    return onSocketClose(event)
  }

  /**
   * Handle a socket error
   * @param  {Error} error [description]
   */
  _handleSocketError(error) {
    console.error(`WebSocket error: ${error.message}`)
  }

  /**
   * Handle a socket opening, send the authentification message to the cozy
   * stack
   * @param  {WebSocket} socket]
   */
  _handleSocketOpen(socket) {
    // Reset record of sent subscribe messages
    this._log = []

    this._listenUnload(socket)

    socket.send(
      JSON.stringify({
        method: 'AUTH',
        payload: this._token
      })
    )
  }

  /**
   * Handle a message from the cozy-stack
   * @param {MessageEvent} event
   */
  _handleSocketMessage(event) {
    const data = JSON.parse(event.data)
    const eventName = data.event.toLowerCase()
    const payload = data.payload

    this._subscriptions.handle(
      pick(payload, ['type', 'id']),
      eventName,
      payload.doc
    )
  }

  /**
   * Listen to window beforeUnload event, and close the current socket when it
   * occurs.
   * @param  {WebSocket} socket Openend socket
   */
  _listenUnload(socket) {
    this.windowUnloadHandler = () => socket.close()
    window && window.addEventListener('beforeunload', this.windowUnloadHandler)
  }

  async _sendSubscribeMessage({ type, id }) {
    const socket = await this._socketPromise
    const payload = pickBy({ type, id })

    const rawMessage = JSON.stringify({
      method: 'SUBSCRIBE',
      payload
    })

    // Do not send the same message twice
    if (this._log.includes(rawMessage)) return

    try {
      socket.send(rawMessage)
    } catch (error) {
      console.warn(`Cannot subscribe to doctype ${type}: ${error.message}`)
      throw error
    }

    this._log.push(rawMessage)
  }

  /**
   * Stop listenning for beforeunload window event. Useful when a socket closes.
   */
  _stopListenningUnload() {
    window &&
      window.removeEventListener('beforeunload', this.windowUnloadHandler)
    delete this.windowUnloadHandler
  }
}

export default {
  // Legacy
  subscribe: (...args) => {
    console.warn(
      'CozyRealtime.subscribe() is deprecated, please create a CozyRealtime instance with CozyRealtime.init()'
    )
    return subscribeLegacy(...args)
  },
  init: options => {
    return CozyRealtime.init(options)
  }
}
