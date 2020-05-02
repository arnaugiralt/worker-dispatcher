/**
 * @typedef {Object} SendInput
 * @property {String} type - The type of action to be called
 * @property {String} method - A string refering to a method in the worker
 * @property {*} [payload] - Any serializable/transferable parameter
 */

class WorkerMessage {
  /**
   * Creates an instance of WorkerMessage.
   * @param {Number} _id - The message id, used for triggering the callbacks
   * @param {*} message - Any serializable/transferable parameter
   * @memberof WorkerMessage
   */
  constructor (_id, message) {
    this._id = _id
    this.message = message
  }
}

export default class WorkerWrapper {
  /**
   * Creates an instance of WorkerWrapper.
   * @param {Worker} worker - A web worker instance
   * @memberof WorkerWrapper
   */
  constructor (worker) {
    this._idx = 0
    this._worker = worker
    this._callbacks = {}

    this._initialise()
  }

  /**
   * Sends the instruction to dispatch the given method with the given
   * payload to the worker
   *
   * @param {String} method - The name of the method to dispatch
   * @param {*} [payload] - Any serializable/transferable parameter
   * @returns Promise<*>
   * @memberof WorkerWrapper
   */
  async dispatch (method, payload) {
    return this.$send({ type: 'dispatch', method, payload })
  }

  /**
   * Adds a new method to the worker's registry
   *
   * @param {String} method - The name that the method will be registered with
   * @param {Function} func - The function that will be registered
   * @returns Promise<*>
   * @memberof WorkerWrapper
   */
  async register (method, func) {
		if (typeof func !== 'fucntion') {
      throw new Error('Second parameter must be a function')
		}

    const payload = func.toSring()
    return this.$send({ type: 'register', method, payload })
  }

  /**
   * Deletes a method from the worker's registry
   *
   * @param {String} method - The name of the method to be deleted from the
   * registry
   * @returns Promise<*>
   * @memberof WorkerWrapper
   */
  async unregister (method) {
    return this.$send({ type: 'register', method })
  }

  /**
   * Sends the given input to the registered worker and returns a promise
   * when it is completed
   *
   * @param {SendInput} input - A SendInput instance
   * @returns
   * @memberof WorkerWrapper
   */
  $send (input) {
    this._idx++
    const id = this._idx
    const message = new WorkerMessage(id, input)

    return new Promise((resolve, reject) => {
      this._callbacks[id] = (err, result) => {
        if (err) {
					reject(new Error(err.message))
				} else {
					resolve(result)
				}
      }
      this._worker.postMessage(message)
    })
  }

  _initialise () {
    this._worker.addEventListener('message', event => {
      this._onMessage(event)
    })
  }

  _onMessage (event) {
    const message = event.data
    if (!Array.isArray(message) || message.length !== 3) {
			return
		}

    const [ id, err, result ] = message
    const callback = this._callbacks[id]
    if (!callback) {
			return
		}

    delete this._callbacks[id]
    callback(err, result)
  }
}
