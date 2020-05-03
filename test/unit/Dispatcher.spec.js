/* global jest, beforeEach, afterEach, describe, it */
import Dispatcher from '../../src/Dispatcher'

// Global arrangements
const mockPostMessage = jest.fn()
const addEventListenerSpy = jest.spyOn(global, 'addEventListener')
Object.defineProperties(global, {
	postMessage: {
		writable: false,
		value: mockPostMessage
	},
	self: {
		writable: true,
		value: global
	}
})

// ----------

describe('Dispatcher module', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	describe('constructor', () => {
		it('should set methods to the given methods and init the event listeners', () => {
			// Arrange
			const input = {
				foo () { return 'bar' },
				baz (x) { return x * x }
			}
			// Act
			const wrapper = new Dispatcher(input)
			// Assert
			const actual = wrapper._methods
			expect(actual).toEqual(input)
			expect(addEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function))
		})
	})

	describe('public methods', () => {
		const input = {
			foo () { return 'bar' },
			baz (x) { return x * x },
			qux: jest.fn()
		}
		const wrapper = new Dispatcher(input)

		describe('dispatch', () => {
			it('should throw an error if called with an unregistered method', async () => {
				// Arrange
				const name = 'bar'
				const expected = new Error(`Method "${name}" not registered`)
				// Act
				let error
				let result
				try {
					result = await wrapper.dispatch(name, 42)
				} catch (err) {
					error = err
				}
				// Assert
				expect(result).not.toBeDefined()
				expect(error).toEqual(expected)
			})

			it('should call the registered method with the given payload', async () => {
				// Arrange
				const name = 'baz'
				// Act
				let error
				let result
				try {
					result = await wrapper.dispatch(name, 42)
				} catch (err) {
					error = err
				}
				// Assert
				expect(error).not.toBeDefined()
				expect(result).toEqual(input.baz(42))
			})

			it('should call the registered method with the given payload and pass the dispatcher\'s scope as the second parameter', async () => {
				// Arrange
				// Act
				await wrapper.dispatch('qux')
				// Assert
				expect(input.qux).toHaveBeenCalledWith(undefined, wrapper)
			})
		})

		describe('register', () => {
			it('should throw an error if the second argument is not a function or a string', async () => {
				// Arrange
				const name = 'bar'
				const expected = new Error('Unsupported function type. Pass either a function or a stringified function')
				// Act
				let error
				try {
					await wrapper.register(name, 42)
				} catch (err) {
					error = err
				}
				// Assert
				expect(error).toEqual(expected)
			})

			it('should add the registered method directly if called with a function as the second argument', async () => {
				// Arrange
				const name = 'baz'
				function fn () {}
				// Act
				let error
				try {
					await wrapper.register(name, fn)
				} catch (err) {
					error = err
				}
				const actual = wrapper._methods[name]
				// Assert
				expect(error).not.toBeDefined()
				expect(actual).toEqual(fn)
			})

			it('should add the registered method converting the stringified function to a regular function, if called with a string as the second argument', async () => {
				// Arrange
				const name = 'baz'
				function fn2 (n) { return n + n }
				// Act
				let error
				try {
					await wrapper.register(name, fn2.toString())
				} catch (err) {
					error = err
				}
				const actual = wrapper._methods[name]
				// Assert
				expect(error).not.toBeDefined()
				// Compare them stringified because they are not equal
				expect(actual.toString()).toEqual(fn2.toString())
			})

			it('should throw an error if the second argument is a string, but not a stringified function', async () => {
				// Arrange
				const name = 'baz'
				const notAfunction1 = '"foo"'
				const expected1 = new Error('Unsupported function type. Pass either a function or a stringified function')
				const notAfunction2 = 'foo'
				// Act
				let error1
				try {
					await wrapper.register(name, notAfunction1)
				} catch (err) {
					error1 = err
				}
				let error2
				try {
					await wrapper.register(name, notAfunction2)
				} catch (err) {
					error2 = err
				}
				// Assert
				expect(error1).toEqual(expected1)
				expect(error2).toBeInstanceOf(Error)
			})
		})

		describe('unregister', () => {
			it('should delete the registered method from the _methods object', async () => {
				// Arrange
				const name = 'bar'
				// Act
				let error
				try {
					await wrapper.unregister(name)
				} catch (err) {
					error = err
				}
				const actual = wrapper._methods[name]
				// Assert
				expect(error).not.toBeDefined()
				expect(actual).not.toBeDefined()
			})
		})
	})

	describe('private methods', () => {
		const eventFactory = ({ type, method, payload } = {}, id = 42) => {
			return new MessageEvent('worker', {
				data: {
					message: {
						type,
						method,
						payload
					},
					_id: id
				},
				origin: '',
				lastEventId: '',
				source: null,
				ports: []
			})
		}
		const input = {
			foo () { return 'bar' },
			baz (x) { return x * x },
			qux: jest.fn()
		}
		const wrapper = new Dispatcher(input)

		describe('_onMessage', () => {
			it('should parse the message from the event, call _act and then call postMessage with the right arguments', async () => {
				// Arrange
				const input = {
					type: 'dispatch',
					method: 'foo',
					payload: undefined
				}
				const event = eventFactory(input, 42)
				// Act
				const [actualError, actualReturnValue] = await wrapper._act(input)
				let error
				try {
					await wrapper._onMessage(event)
				} catch (err) {
					error = err
				}
				// Assert
				expect(mockPostMessage).toHaveBeenCalledWith([42, actualError, actualReturnValue])
				expect(error).not.toBeDefined()
			})
		})

		describe('_act', () => {
			it('should return an error if the type is not one of "dispatch", "register" or "unregister"', async () => {
				// Arrange
				const expected = new Error('Unsupported action type')
				const input = {
					type: 'foo'
				}
				// Act
				let [error, result] = await wrapper._act(input)
				// Assert
				expect(error).toEqual(expected)
			})

			it('should return an error if any error is thrown', async () => {
				// Arrange
				const input = {
					type: 'register',
					method: 'foobar',
					payload: '42'
				}
				let expected
				// Force error to be thrown
				try {
					wrapper.register(input.method, input.payload)
				} catch (err) {
					expected = err
				}
				// Act
				let [error, result] = await wrapper._act(input)
				// Assert
				expect(error).toEqual(expected)
			})

			it('should return no error and the result if the call is successful', async () => {
				// Arrange
				const input = {
					type: 'unregister',
					method: 'foo'
				}
				let expected
				// Force error to be thrown
				expected = wrapper.unregister(input.method)
				// Act
				let [error, result] = await wrapper._act(input)
				// Assert
				expect(error).not.toBeDefined()
				expect(result).toEqual(expected)
			})
		})
	})
})
