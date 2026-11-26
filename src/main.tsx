import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { PostPage } from './PostPage'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/^\/post\/?$/.test(location.pathname) ? <PostPage /> : <App />}
  </StrictMode>,
)
