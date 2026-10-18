const active = new WeakMap()

export function animatePaperEdge(node, { rotation = '-1deg' } = {}) {
  if (!node?.animate) return undefined
  active.get(node)?.cancel()
  const media = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : null
  if (media?.matches) return undefined
  const animation = node.animate([
    { transform: `translate(10px,-14px) rotate(${rotation})` },
    { transform: `translate(-1px,2px) rotate(${rotation})`, offset: .8 },
    { transform: `translate(0,0) rotate(${rotation})` },
  ], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' })
  active.set(node, animation)
  const cancel = () => animation.cancel()
  const changed = event => { if (event.matches) cancel() }
  media?.addEventListener?.('change', changed)
  animation.finished?.catch(() => {}).finally(() => media?.removeEventListener?.('change', changed))
  return () => { cancel(); media?.removeEventListener?.('change', changed); if (active.get(node) === animation) active.delete(node) }
}
