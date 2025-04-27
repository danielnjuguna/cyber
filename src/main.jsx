import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Import the router config. Adjust path if necessary.
// Since this is frontend code, we might need to rethink how to get this
// or if it's truly needed here. The router URL should be sufficient.
// import { ourFileRouter } from '../api/core.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* <NextSSRPlugin
      // Pass the router config to the plugin
      // This might not be applicable/needed in a standard Vite/React setup
      // Check UploadThing docs for non-Next.js SSR integration if required.
      // For client-side rendering (CSR), this plugin might not be necessary.
      routerConfig={extractRouterConfig(ourFileRouter)} 
    /> */}
    <App />
  </React.StrictMode>,
)
