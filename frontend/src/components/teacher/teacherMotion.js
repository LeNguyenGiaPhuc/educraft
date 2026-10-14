const activeAnimations = new WeakMap()

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Animate only the currently selected paper. A new selection cancels the
 * previous animation so the latest user intent always wins.
 */
export function animateTeacherDossier(node) {
  if (!node || prefersReducedMotion() || typeof node.animate !== 'function') {
    return
  }

  activeAnimations.get(node)?.cancel()

  const animation = node.animate(
    [
      { opacity: 0.72, transform: 'translateY(14px) rotate(-0.7deg)' },
      { opacity: 1, transform: 'translateY(0) rotate(0deg)' },
    ],
    {
      duration: 520,
      easing: 'cubic-bezier(.2,.8,.2,1)',
      fill: 'both',
    },
  )

  activeAnimations.set(node, animation)
  animation.finished
    ?.catch(() => {})
    .finally(() => {
      if (activeAnimations.get(node) === animation) {
        activeAnimations.delete(node)
      }
    })
}
