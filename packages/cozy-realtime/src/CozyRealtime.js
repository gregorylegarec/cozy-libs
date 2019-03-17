/* global WebSocket */
import pick from 'lodash/pick'
import pickBy from 'lodash/pickBy'

import { isSecureURL } from './helpers/url'
import RealtimeSubscriptions from './RealtimeSubscriptions'
import Validator, {
  isBoolean,
  isRequired,
  isRequiredIfNo,
  isString,
  isURL
} from './helpers/Validator'

const MAX_RETRIES = 3
const RETRY_BASE_DELAY = 1000

export class CozyRealtime {
  /**
   * Log were subcribe messages sent are recored
   * @type {Array}
   */
  _log = []

  /**
   * Promise of an opnened socket
   * @type {Promise}
   */
  _socketPromise = null

  /**
   * Realtime subscriptions
   * @type {RealtimeSubscriptions}
   */
  _subscriptions = null

  _retries = 0
  _retryDelay = RETRY_BASE_DELAY

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
    Validator.create({
      domain: [isRequiredIfNo(['url']), isString],
      secure: [isBoolean],
      token: [isRequired, isString],
      url: [isRequiredIfNo(['domain']), isURL]
    }).validate({ domain, secure, token, url })

    this._domain = domain
    this._secure = url ? isSecureURL(url) : secure
    this._token = token
    this._url = url

    this._subscriptions = new RealtimeSubscriptions()
    this._connect()
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
    this._socketPromise = Promise(resolve => {
      const protocol = this._secure ? 'wss:' : 'ws:'
      const socket = new WebSocket(
        `${protocol}//${this._domain}/realtime/`,
        'io.cozy.websocket'
      )

      socket.onmessage = this._handleSocketMessage.bind(this)
      socket.onclose = this._handleSocketClose.bind(this)
      socket.onerror = this._handleSocketError.bind(this)
      socket.onopen = () => {
        this._handleSocketOpen(socket)
        resolve(socket)
      }
    })

    return this._socketPromise
  }

  /**
   * Handles a socket closing
   * @param  {CloseEvent} event
   */
  _handleSocketClose(event) {
    // Set to null to know that it is not available anymore.
    this._socketPromise = null
    this._stopListenningUnload()

    if (!event.wasClean && this._retries < MAX_RETRIES) {
      setTimeout(() => {
        this._connect()
      }, this._retryDelay)

      this._retries++
      this._retryDelay = this._retryDelay * 2
    }
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
    // Reset _retries
    this._retries = 0
    this._retryDelay = RETRY_BASE_DELAY

    // Reset record of sent subscribe messages
    this._log = []

    this._listenUnload(socket)

    socket.send(
      JSON.stringify({
        method: 'AUTH',
        payload: this._token
      })
    )

    // Once the socket is open, we send subscribe message
    // from current subscription.
    // Useful it the socket opened after the first subscribe,
    // or in case of a reconnection.
    for (const selector in this._subscriptions.toSubscribeMessages())
      this._sendSubscribeMessage(selector)
  }

  /**
   * Handle a message from the cozy-stack
   * @param {MessageEvent} event
   */
  _handleSocketMessage(event) {
    const data = JSON.parse(event.data)
    const eventName = data.event.toLowerCase()
    const payload = data.payload

    // if (eventType === 'error') {
    //   const realtimeError = new Error(payload.title)
    //   pick()[('status', 'code', 'source')]
    //   errorFields.forEach(property => {
    //     realtimeError[property] = payload[property]
    //   })
    //
    //   throw realtimeError
    // }

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

export default CozyRealtime
