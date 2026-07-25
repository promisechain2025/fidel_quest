import { Routes, Route } from 'react-router-dom'
import { Header, Footer } from './components.jsx'
import Home from './pages/Home.jsx'
import Amharic from './pages/Amharic.jsx'
import Tigrinya from './pages/Tigrinya.jsx'
import Teachers from './pages/Teachers.jsx'
import Homeschool from './pages/Homeschool.jsx'
import About from './pages/About.jsx'

export default function App() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/amharic" element={<Amharic />} />
          <Route path="/tigrinya" element={<Tigrinya />} />
          <Route path="/teachers" element={<Teachers />} />
          <Route path="/homeschool" element={<Homeschool />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
