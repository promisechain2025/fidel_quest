import FidelQuestApp from './FidelQuestApp'
import { TibebFrame } from './components/Manuscript'

// The whole product: lesson levels, 3D Letter Runner, Fidel Skylands,
// Classic game, and the Letter Explorer, behind one home screen.
// TibebFrame is the app-wide manuscript chrome (woven side borders + gold
// lattice); mounted once here so every screen inherits it.
export default function App() {
  return (
    <>
      <TibebFrame />
      <FidelQuestApp />
    </>
  )
}
