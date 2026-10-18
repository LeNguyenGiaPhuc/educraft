import { useEffect, useRef } from 'react'
import { animatePaperEdge } from './paperMotion.js'

/** Shared presentation only. Neither content nor inputs move. */
function PaperEdge({ trigger, rotation = '-1deg' }) {
  const edge = useRef(null)
  useEffect(() => animatePaperEdge(edge.current, { rotation }), [trigger, rotation])
  return <span ref={edge} className="kf-paper-edge" aria-hidden="true" />
}

export default PaperEdge
