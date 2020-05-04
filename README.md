Simple promise-based wrapper for web workers

## Features

Abstracts interaction between the main thread and worker threads by using a simple, dispatcher based API

```js
// On the worker
import { Dispatcher } from 'worker-dispatcher'
new Dispatcher({
    fibonacci (n) {
        const result = [0, 1]
        for (let i = 2; i < n; i++) {
            result.push(result[i - 2] + result[i - 1])
        }
        return result
    }
})

// On the main thread
import { WorkerWrapper } from 'worker-dispatcher'

const wrapper = new WorkerWrapper(new Worker('my/worker/path'))
(async () => {
    await wrapper.dispatch('fibonacci', 10000000)
})()
```

---

## API

#### Main thread - `WorkerWrapper`

The worker wrapper is a class that requires to be initialized with a worker

```js
import { WorkerWrapper } from 'worker-dispatcher'

const myWrapper = new WorkerWrapper(new Worker('worker.js'))
```

#### Worker thread - `Dispatcher`

The dispatcher is a class that requires to be initialized with an object containing the methods that we want available to be dispatched in the worker

```js
import { Dispatcher } from 'worker-dispatcher'
import { myMethods, someOtherMethods } from 'my/custom/module'

function fibonacci (n) {
	const result = [0, 1]
	for (let i = 2; i < n; i++) {
		result.push(result[i - 2] + result[i - 1])
	}
	return result
}

const myWrapper = new Dispatcher({
	fibonacci,
	...myMethods,
	...someOtherMethods
})
```

Every method must have only one argument. If you need to pass more than one parameter, use an object to wrap the payload.
The second argument a method receives is the class' scope, so a method can call other methods.

```js
import { Dispatcher } from 'worker-dispatcher'

function multiply ({ x, y }) {
	return x * y
}

function divide ({ x, y}) {
	return x / y
}

async function myFunc ({ a, b }, { dispatch }) {
	const op1 = await dispatch('multiply', { x: a, y: b * 3})
	const op2 = await dispatch('divide', { x: op1, y: a })
	return op2 - b
}

const myWrapper = new Dispatcher({
	myFunc,
	divide,
	multiply
})
```

#### Common

Both `Dispatcher` and `WorkerWrapper` share the same API

##### dispatch(method, payload)

Sends a message to the worker with the order to dispatch the given method with the given payload. Returns a promise.

```js
myWrapper.dispatch('fibonacci', 100000)
	.then(result => console.log(result))
	.catch(err => console.error(err))
```

##### register(method, func)

Sends a message to the worker instructing it to register the given function with the given name in the registry of available actions to dispatch. Returns a promise that resolves to undefined.

```js
function multiply ({ x, y }) {
	return x * y
}
myWrapper.register('multiply', multiply)
	.then(() => console.log('Registered'))
	.catch(err => console.error(err))
```

##### unregister(method)

Sends a message to the worker instructing it to unregister the method registered under the given name

```js
myWrapper.unregister('multiply')
	.then(() => console.log('Unregistered'))
	.catch(err => console.error(err))

myWrapper.dispatch('multiply', { x: 2, y: 3})
// Err: Method "multiply" not registered
```

## Usage examples in frameworks

### Vue + Vuex

You can easily use this library by binding the wrapper to a Vuex plugin.

```js
// store/index.js
import Vue from 'vue'
import Vuex from 'vuex'
import { WorkerWrapper } from 'worker-dispatcher'

Vue.use(Vuex)

// A simple plugin 
const workerPlugin = store => {
	store.worker = new WorkerWrapper(new Worker('@/worker-store/example/worker', { type: 'module' }))
}

export default new Vuex.Store({
  state: {
  },
  mutations: {
  },
  actions: {
    async myAction ({ worker }, payload) {
      await worker.dispatch('baz', payload)
    }
  },
  modules: {
  },
  plugins: [workerPlugin]
})

// In your Vue components / Vuex actions
...
state: {
	foo: 'bar'
},
actions: {
	async myAction ({ state, worker }) {
		return worker.dispatch('myWorkerAction', state.foo)
	}
}
...

export default {
	data () {
		return {
			foo: 'bar'
		}
	},
	methods: {
		async myAction () {
			return this.$store.worker.dispatch('myWorkerAction', this.foo)
		}
	}
}
```
