import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('[ui crash]', error, info.componentStack) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="lost">
        <div>
          <h1>Fault</h1>
          <p>The screen crashed: {String(this.state.error.message || this.state.error)}</p>
          <button className="btn primary" onClick={() => window.location.reload()}>Reload</button>
        </div>
      </div>
    )
  }
}
