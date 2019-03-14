/* global WebSocket */
import { subscribe as subscribeLegacy } from './legacy'
// cozySocket is a custom object wrapping logic to websocket and exposing a subscription
// interface, it's a global variable to avoid creating multiple at a time
let cozySocket

// const NUM_RETRIES = 3
// const RETRY_BASE_DELAY = 1000

// stored listeners
// stored as Map { [doctype]: Object { [event]: listeners } }
let listeners = new Map()

// getters
export const getListeners = () => listeners
export const getCozySocket = () => cozySocket

// listener key computing, according to doctype only or with doc id
const LISTENER_KEY_SEPARATOR = '/' // safe since we can't have a '/' in a doctype
const getListenerKey = (doctype, docId) =>
  docId ? [doctype, docId].join(LISTENER_KEY_SEPARATOR) : doctype

// const getTypeAndIdFromListenerKey = listenerKey => {
//   const splitResult = listenerKey.split(LISTENER_KEY_SEPARATOR)
//   return {
//     doctype: splitResult.shift(),
//     // if there still are some lements, this is the doc id
//     docId: splitResult.length ? splitResult.join(LISTENER_KEY_SEPARATOR) : null
//   }
// }

// return true if the there is at least one event listener
const hasListeners = socketListeners => {
  for (let event of ['created', 'updated', 'deleted']) {
    if (socketListeners[event] && socketListeners[event].length) return true
  }
  return false
}

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

const onSocketMessage = event => {
  const data = JSON.parse(event.data)
  const eventType = data.event.toLowerCase()
  const payload = data.payload

  if (eventType === 'error') {
    const realtimeError = new Error(payload.title)
    const errorFields = ['status', 'code', 'source']
    errorFields.forEach(property => {
      realtimeError[property] = payload[property]
    })

    throw realtimeError
  }

  // the payload should always have an id here
  const listenerKey = getListenerKey(payload.type, payload.id)

  // id listener call
  if (listeners.has(listenerKey) && listeners.get(listenerKey)[eventType]) {
    listeners.get(listenerKey)[eventType].forEach(listener => {
      listener(payload.doc)
    })
  }

  if (listenerKey === payload.type) return

  // doctype listener call
  if (listeners.has(payload.type) && listeners.get(payload.type)[eventType]) {
    listeners.get(payload.type)[eventType].forEach(listener => {
      listener(payload.doc)
    })
  }
}

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
  constructor({ domain, secure = true, token, url }) {
    validateConfig({ domain, secure, token, url })

    this._domain = domain
    this._secure = url ? isSecureURL(url) : secure
    this._token = token
    this._url = url

    this._socketPromise = this._connect()
  }

  static init(options) {
    return new CozyRealtime(options)
  }

  async subscribe({ type, id }, eventName, handler) {
    if (typeof handler !== 'function')
      throw new Error('Realtime event handler must be a function')

    const listenerKey = getListenerKey(type, id)

    if (!listeners.has(listenerKey)) {
      listeners.set(listenerKey, {})
    }

    const eventListeners = listeners.get(listenerKey)[eventName] || []
    eventListeners.push(handler)
    listeners.set(listenerKey, {
      ...listeners.get(listenerKey),
      [eventName]: eventListeners
    })
    const socket = await this._socketPromise

    try {
      const payload = { type }
      if (id) payload.id = id
      socket.send(
        JSON.stringify({
          method: 'SUBSCRIBE',
          payload
        })
      )
    } catch (error) {
      console.warn(`Cannot subscribe to doctype ${type}: ${error.message}`)
      throw error
    }
  }

  unsubscribe({ type, id }, eventName, handler) {
    const listenerKey = getListenerKey(type, id)

    if (listeners.has(listenerKey)) {
      const socketListeners = listeners.get(listenerKey)
      if (
        socketListeners[eventName] &&
        socketListeners[eventName].includes(handler)
      ) {
        listeners.set(listenerKey, {
          ...socketListeners,
          [eventName]: socketListeners[eventName].filter(l => l !== handler)
        })
      }
      if (!hasListeners(listeners.get(listenerKey))) {
        listeners.delete(listenerKey)
      }
    }
    return this
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
   * @param  {MessageEvent} event
   */
  _handleSocketMessage(event) {
    return onSocketMessage(event)
  }

  /**
   * Listen to window beforeUnload event, and close the current socket when it
   * occurs.
   * @param  {WebSocket} socket Openend socket
   */
  _listenUnload(socket) {
    this.windowUnloadHandler = () => socket.close()
    window.addEventListener('beforeunload', this.windowUnloadHandler)
  }

  /**
   * Stop listenning for beforeunload window event. Useful when a socket closes.
   */
  _stopListenningUnload() {
    window.removeEventListener('beforeunload', this.windowUnloadHandler)
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
