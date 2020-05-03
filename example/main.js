import { WorkerWrapper } from './worker-dispatcher.js'

const wrapper = new WorkerWrapper(new Worker('./worker.js', { type: 'module' }))

const input = document.querySelector('#num')
const button1 = document.querySelector('#btn1')
const button2 = document.querySelector('#btn2')
const results = document.querySelector('#results')

button1.addEventListener('click', async () => {
  button1.disabled = true
  button2.disabled = true
  const value = parseInt(input.value)
  const t0 = performance.now()
  await wrapper.dispatch('fibonacci', value)
  const t1 = performance.now()
  results.textContent = `Took ${t1 - t0}ms to calculate the first ${value} fibonacci numbers`
  button1.disabled = false
  button2.disabled = false
})
button2.addEventListener('click', async () => {
  button1.disabled = true
  button2.disabled = true
  const value = parseInt(input.value)
  const t0 = performance.now()
  const res = await wrapper.dispatch('findPrimes', value)
  const t1 = performance.now()
  results.textContent = `Took ${t1 - t0}ms to calculate all primes under ${value}. There are ${res} primes under ${value}`
  button1.disabled = false
  button2.disabled = false
})
