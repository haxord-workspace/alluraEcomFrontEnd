import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Provider } from 'react-redux'
import { store } from './store'
import { GoogleOAuthProvider } from '@react-oauth/google'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
if (!googleClientId) {
  console.error('VITE_GOOGLE_CLIENT_ID is not set — Google sign-in disabled');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <GoogleOAuthProvider clientId={googleClientId ?? ''}>
        <App />
      </GoogleOAuthProvider>
    </Provider>
  </StrictMode>,
)
