const activeAnimations = new WeakMap()

/** Only paper chrome moves. Text stays still; cleanup and latest intent cancel. */
export function animateTeacherDossier(node) {
  if (!node || typeof node.animate !== 'function') return undefined
  activeAnimations.get(node)?.cancel()
  const media = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
  if (media?.matches) return undefined
  const animation = node.animate([
    { transform: 'translate(12px, -16px) rotate(-1deg)' },
    { transform: 'translate(-2px, 3px) rotate(-1deg)', offset: 0.8 },
    { transform: 'translate(0, 0) rotate(-1deg)' },
  ], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'none' })
  activeAnimations.set(node, animation)
  const cancel = () => {
    animation.cancel()
    if (activeAnimations.get(node) === animation) activeAnimations.delete(node)
  }
  const onMotionChange = (event) => { if (event.matches) cancel() }
  media?.addEventListener?.('change', onMotionChange)
  animation.finished?.catch(() => {}).finally(() => {
    if (activeAnimations.get(node) === animation) activeAnimations.delete(node)
    media?.removeEventListener?.('change', onMotionChange)
  })
  return () => { media?.removeEventListener?.('change', onMotionChange); cancel() }
}
