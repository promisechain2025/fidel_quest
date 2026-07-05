import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import FidelQuestApp from './FidelQuestApp'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FidelQuestApp />
  </StrictMode>,
)
