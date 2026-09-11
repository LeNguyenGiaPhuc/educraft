import { Link } from 'react-router-dom'

function PageErrorState({ kicker, title, message }) {
  return (
    <main className="page-content">
      <div className="page-container">
        <section className="state-panel state-panel-error" role="alert">
          <p className="state-kicker">{kicker}</p>
          <h1>{title}</h1>
          <p>{message}</p>
          <Link className="button button-primary" to="/">
            Về tổng quan
          </Link>
        </section>
      </div>
    </main>
  )
}

export default PageErrorState
