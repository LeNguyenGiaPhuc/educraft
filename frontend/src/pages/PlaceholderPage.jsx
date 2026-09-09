import { Link } from 'react-router-dom'

function PlaceholderPage({ eyebrow, title, description }) {
  return (
    <main className="page-content">
      <div className="page-container">
        <section className="state-panel placeholder-panel">
          <p className="state-kicker">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
          <Link className="button button-primary" to="/">
            Về tổng quan
          </Link>
        </section>
      </div>
    </main>
  )
}

export default PlaceholderPage
