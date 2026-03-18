import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import router from './router'
import './lib/i18n'
import './index.css'
import 'leaflet/dist/leaflet.css'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null } }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(error, info) { console.error('App crash:', error, info) }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', padding:'20px', fontFamily:'sans-serif' }}>
          <h2 style={{ color:'#5B6BF5' }}>Oops, something went wrong</h2>
          <p style={{ color:'#666', marginTop:'8px' }}>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()} style={{ marginTop:'16px', padding:'10px 20px', background:'#5B6BF5', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer' }}>
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3500,
        style: {
          background: '#1A1A2E',
          color: '#fff',
          borderRadius: '14px',
          fontSize: '14px',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
        },
        success: { iconTheme: { primary: '#22C55E', secondary: '#fff' } },
        error:   { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
      }}
    />
  </React.StrictMode>
)
