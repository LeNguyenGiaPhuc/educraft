export const COUNT_CONCURRENCY = 4
export const COUNT_CACHE_TTL = 60_000

/** Shared transport slots: obsolete requests retain their slot until settlement. */
export function createCountPool(limit = COUNT_CONCURRENCY) {
  let running = 0
  const queue = []
  function pump() {
    while (running < limit && queue.length) {
      const job = queue.shift()
      running++
      // run is async; its synchronous prefix marks started before yielding.
      Promise.resolve(job.run()).finally(() => { running--; pump() })
    }
  }
  return {
    enqueue(job) { queue.push(job); pump() },
    cancel(token) {
      for (let i = queue.length - 1; i >= 0; i--) {
        if (queue[i].token === token) { queue.splice(i, 1)[0].skip() }
      }
    },
  }
}
const sharedCountPool = createCountPool()
const EMPTY_SNAPSHOT = {}

// Browse UI updates immediately; only network demand waits for typing to settle.
export function watchVisibleCounts(store, classId, ids, { setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  if (!store) return undefined
  let stop
  const timer = setTimer(() => { stop = store.setVisible(classId, ids) }, 150)
  return () => { clearTimer(timer); stop?.() }
}

/** Cache belongs to one mounted ClassDetail; never persists auth/user data globally. */
export function createSubmissionCountStore({ listSubmissions, pool = sharedCountPool, now = Date.now } = {}) {
  let classId = null, token = null, visible = new Set(), snapshot = {}
  const cache = new Map(), listeners = new Set()
  const metrics = { scheduled: 0, started: 0, completed: 0, skipped: 0, stale: 0, cacheHits: 0, running: 0 }
  const publish = () => { snapshot = Object.fromEntries([...visible].map(id => [id, cache.get(id) ?? { status: 'idle' }])); listeners.forEach(fn => fn()) }
  function stop() {
    if (token) { token.active = false; pool.cancel(token) }
    for (const [id, entry] of cache) if (entry.status === 'loading') cache.delete(id)
    token = null
  }
  function schedule(id) {
    const requestToken = token
    const loading = { status: 'loading' }
    cache.set(id, loading)
    metrics.scheduled++
    pool.enqueue({ token: requestToken, skip: () => { metrics.skipped++ }, run: async () => {
      if (!requestToken.active) { metrics.skipped++; return }
      metrics.started++; metrics.running++
      let result
      try {
        const submissions = await listSubmissions(id)
        if (!Array.isArray(submissions)) throw new Error('Invalid submission list')
        result = { status: 'success', count: submissions.length, loadedAt: now() }
      } catch { result = { status: 'error' } }
      finally { metrics.completed++; metrics.running-- }
      if (!requestToken.active || token !== requestToken || cache.get(id) !== loading) { metrics.stale++; return }
      cache.set(id, result); publish()
    } })
  }
  return {
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) },
    getSnapshot(expectedClassId) { return expectedClassId && classId !== expectedClassId ? EMPTY_SNAPSHOT : snapshot },
    stats() { return { ...metrics, queued: metrics.scheduled - metrics.started - metrics.skipped } },
    setVisible(nextClassId, ids) {
      stop()
      if (classId !== nextClassId) { cache.clear(); classId = nextClassId }
      visible = new Set(ids)
      token = { active: true }
      const current = token
      for (const id of visible) {
        const entry = cache.get(id)
        if (entry?.status === 'error') continue // Explicit retry, never a retry storm.
        if (entry?.status === 'success' && now() - entry.loadedAt < COUNT_CACHE_TTL) metrics.cacheHits++
        else schedule(id)
      }
      publish()
      return () => { if (token === current) { stop(); publish() } }
    },
    retry(id) {
      if (!token || !visible.has(id) || cache.get(id)?.status !== 'error') return
      schedule(id); publish()
    },
    invalidate(id) { cache.delete(id); publish() },
  }
}
