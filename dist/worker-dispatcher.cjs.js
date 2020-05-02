'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

class Dispatcher {
  /**
   * Creates an instance of Dispatcher
   * @param {Object} methods - An object containing the methods that will be available to be dispatched
   * @memberof Dispatcher
   */
  constructor (methods) {
    this._methods = methods;
    this._initListeners();
  }

  /**
   * Executes the registered method for the given name
   *
   * @param {String} name - The method's name
   * @param {*} payload - The payload that the method will be called with
   * @returns Function
   * @memberof Dispatcher
   */
  async dispatch (name, payload) {
    const method = this._methods[name];
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
   * @param {String} name - The name that the function will be registered to
   * @param {Function|String} func - A regular or stringified function
   * @memberof Dispatcher
   */
  register (name, func) {
    let parsedFunc;
    switch (typeof func) {
      case 'function':
        parsedFunc = func;
        break
      case 'string':
        parsedFunc = new Function('return ' + serializedFunc)();
        break
      default:
        throw new Error('Unsupported function type. Pass either a function or a stringified function')
		}

    this._methods[name] = parsedFunc;
  }

  /**
   * Deletes the method that corresponds with the given name from the registry
   *
   * @param {String} name - The name of the method to delete
   * @memberof Dispatcher
   */
  unregister (name) {
    delete this._methods[name];
  }

  _initListeners () {
    const act = async ({ type, method, payload }) => {
      try {
        let returnValue;
        switch (type) {
          case 'dispatch':
            returnValue = await this.dispatch(method, payload);
            break
          case 'register':
            this.register(method, payload);
            break
          case 'unregister':
            this.unregister(method);
            break
          default:
            throw new Error('Unsupported action type')
        }
        return [undefined, returnValue]
      } catch (error) {
        return [error, undefined]
      }
    };

    self.addEventListener('message', async event => {
      const { message, _id } = event.data;
      const [error, returnValue] = await act(message);
      postMessage([_id, error, returnValue]);
    });
  }
}

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
    this._id = _id;
    this.message = message;
  }
}

class WorkerWrapper {
  /**
   * Creates an instance of WorkerWrapper.
   * @param {Worker} worker - A web worker instance
   * @memberof WorkerWrapper
   */
  constructor (worker) {
    this._idx = 0;
    this._worker = worker;
    this._callbacks = {};

    this._initialise();
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

    const payload = func.toSring();
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
    this._idx++;
    const id = this._idx;
    const message = new WorkerMessage(id, input);

    return new Promise((resolve, reject) => {
      this._callbacks[id] = (err, result) => {
        if (err) {
					reject(new Error(err.message));
				} else {
					resolve(result);
				}
      };
      this._worker.postMessage(message);
    })
  }

  _initialise () {
    this._worker.addEventListener('message', event => {
      this._onMessage(event);
    });
  }

  _onMessage (event) {
    const message = event.data;
    if (!Array.isArray(message) || message.length !== 3) {
			return
		}

    const [ id, err, result ] = message;
    const callback = this._callbacks[id];
    if (!callback) {
			return
		}

    delete this._callbacks[id];
    callback(err, result);
  }
}

exports.Dispatcher = Dispatcher;
exports.WorkerWrapper = WorkerWrapper;
