import assert from 'node:assert/strict'
import { test } from 'node:test'
import { animatePaperEdge } from '../../../src/components/kinetic/paperMotion.js'

test('reduced motion does not animate and latest intent cancels, with media/unmount cleanup', async t => {
  const oldWindow = globalThis.window
  t.after(() => { globalThis.window = oldWindow })
  const listeners = new Set()
  const media = { matches: true, addEventListener: (_,fn) => listeners.add(fn), removeEventListener: (_,fn) => listeners.delete(fn) }
  globalThis.window = { matchMedia: () => media }
  let calls = 0, cancellations = 0
  const node = { animate: () => { calls++; return { cancel: () => cancellations++, finished: new Promise(() => {}) } } }
  assert.equal(animatePaperEdge(node), undefined)
  assert.equal(calls, 0)
  media.matches = false
  const first = animatePaperEdge(node), second = animatePaperEdge(node)
  assert.equal(calls, 2)
  assert.equal(cancellations, 1)
  for (const listener of [...listeners]) listener({ matches: true })
  assert.equal(cancellations, 3)
  first(); second()
  assert.equal(listeners.size, 0)
})

test('full-height paper can lift without rotation while ordinary edges keep their original motion', () => {
  const frames = []
  const node = { animate: keyframes => { frames.push(keyframes); return { cancel() {}, finished: Promise.resolve() } } }
  animatePaperEdge(node, { rotation: '0deg' })?.()
  animatePaperEdge(node)?.()
  assert.ok(frames[0].every(frame => frame.transform.includes('rotate(0deg)')))
  assert.ok(frames[1].every(frame => frame.transform.includes('rotate(-1deg)')))
})
