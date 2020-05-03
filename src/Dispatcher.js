export default class Dispatcher {
  /**
   * Creates an instance of Dispatcher
   * @param {Object} methods - An object containing the methods that will be available to be dispatched
   * @memberof Dispatcher
   */
  constructor (methods) {
    this._methods = methods
    self.addEventListener('message', this._onMessage.bind(this))
  }

  /**
   * Executes the registered method for the given name
   *
   * @public
   * @param {String} name - The method's name
   * @param {*} payload - The payload that the method will be called with
   * @returns Function
   * @memberof Dispatcher
   */
  async dispatch (name, payload) {
    const method = this._methods[name]
    if (!method) {
      throw new Error(`Method "${name}" not registered`)
    }

    // pass scope as 2nd parameter to be able to dispatch other methods
    // from inside
    return method(payload, this)
  }

  /**
   * Registers a new method to the methods registry, or overwrites it if a
   * method for the given name already exists
	 *
   * @public
   * @param {String} name - The name that the function will be registered to
   * @param {Function|String} func - A regular or stringified function
   * @memberof Dispatcher
   */
  register (name, func) {
    let parsedFunc
    switch (typeof func) {
      case 'function':
        parsedFunc = func
        break
      case 'string':
				try {
					parsedFunc = new Function('return ' + func)()
					if (typeof parsedFunc === 'function') {
						break
					}
				} catch (err) {
					throw err
				}
      default:
        throw new Error('Unsupported function type. Pass either a function or a stringified function')
		}

    this._methods[name] = parsedFunc
  }

  /**
   * Deletes the method that corresponds with the given name from the registry
	 *
   * @public
   * @param {String} name - The name of the method to delete
   * @memberof Dispatcher
   */
  unregister (name) {
    delete this._methods[name]
  }

  /**
	 * @private
	 * @param {MessageEvent} event
	 * @memberof Dispatcher
	 */
	async _onMessage (event) {
		const { message, _id } = event.data
		const [error, returnValue] = await this._act(message)
		postMessage([_id, error, returnValue])
	}

	async _act ({ type, method, payload }) {
		try {
			let returnValue
			switch (type) {
				case 'dispatch':
					returnValue = await this.dispatch(method, payload)
					break
				case 'register':
					returnValue = this.register(method, payload)
					break
				case 'unregister':
					returnValue = this.unregister(method)
					break
				default:
					throw new Error('Unsupported action type')
			}
			return [undefined, returnValue]
		} catch (error) {
			return [error, undefined]
		}
	}
}
