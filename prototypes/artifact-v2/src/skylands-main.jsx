import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import FidelSkylands from './FidelSkylands'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FidelSkylands />
  </StrictMode>,
)
