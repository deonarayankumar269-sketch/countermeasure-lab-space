import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="lost">
      <div>
        <h1>404</h1>
        <p>Nothing at this address. The page moved or never existed.</p>
        <Link to="/" className="btn primary">Back to base</Link>
      </div>
    </div>
  )
}
