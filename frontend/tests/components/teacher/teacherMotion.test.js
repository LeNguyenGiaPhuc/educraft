import assert from 'node:assert/strict'
import { test } from 'node:test'
import { animateTeacherDossier } from '../../../src/components/teacher/teacherMotion.js'

test('paper motion cancels latest intent, cleans up and responds to reduced motion', async () => {
  const originalWindow = globalThis.window
  const listeners = new Set()
  const media = { matches: false, addEventListener: (_, listener) => listeners.add(listener), removeEventListener: (_, listener) => listeners.delete(listener) }
  globalThis.window = { matchMedia: () => media }
  const animations = []
  const node = { animate(frames, options) {
    let finish
    const animation = { frames, options, cancelled: false, finished: new Promise(resolve => { finish = resolve }), cancel() { this.cancelled = true; finish() } }
    animations.push(animation)
    return animation
  } }
  try {
    const firstCleanup = animateTeacherDossier(node)
    const secondCleanup = animateTeacherDossier(node)
    assert.equal(animations[0].cancelled, true)
    assert.equal(animations[1].options.fill, 'none')
    assert.equal(animations[1].options.duration, 520)
    assert.ok(animations[1].frames.every(frame => !('opacity' in frame)))
    firstCleanup()
    assert.equal(animations[1].cancelled, false)
    for (const listener of listeners) listener({ matches: true })
    assert.equal(animations[1].cancelled, true)
    secondCleanup()
    assert.equal(listeners.size, 0)
    media.matches = true
    assert.equal(animateTeacherDossier(node), undefined)
    assert.equal(animations.length, 2)
    assert.equal(animateTeacherDossier(null), undefined)
    await Promise.resolve()
  } finally {
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
  }
})
