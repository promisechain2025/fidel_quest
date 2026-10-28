/* A cream wooden plaque that shows "the letter you just placed, and a word
   that starts with it" (picture + fidel word) for the toy-brick games.
   Fidel and the picture only: no transliteration, no English gloss. */
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Volume2 } from 'lucide-react'
import { t } from '../platform/i18n'
import { BrickTile, BrickPicture, roundBtnCss } from './brickKit'

export default function BrickExample({ example, color = '#2f86d6', onTap }) {
  const reduce = useReducedMotion()
  return (
    <div className="flex h-[88px] items-center justify-center">
      <AnimatePresence>
        {example && (
          <motion.button
            type="button"
            key={example.id}
            onClick={onTap}
            data-testid="game-example"
            aria-label={`${example.glyph}${example.word ? ` - ${example.word.geez}` : ''}. ${t('echoTapHear', 'Tap to hear')}`}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.85, rotate: -3 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 16 }}
            className="relative flex items-center gap-2.5 rounded-[22px] py-2 pl-3 pr-4"
            style={{
              background: 'linear-gradient(180deg,#fffaf0,#f3e3bd)', border: '4px solid #8a5426',
              boxShadow: 'inset 0 3px 0 rgba(255,255,255,.7), 0 6px 0 #5a3414, 0 12px 16px rgba(0,0,0,.3)',
            }}
          >
            <BrickTile color={color} studs={1} width={46} height={46} depth={4} className="text-[30px]">{example.glyph}</BrickTile>
            {example.word && (
              <>
                <BrickPicture geez={example.word.geez} emoji={example.word.picture} size={50} />
                <span className="geez text-[26px] font-black" style={{ color: '#5a3414', textShadow: '0 1px 0 rgba(255,255,255,.8)' }}>{example.word.geez}</span>
              </>
            )}
            <span className="absolute -bottom-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full" style={roundBtnCss('#2f86d6')} aria-hidden="true">
              <Volume2 className="h-4 w-4" color="#fff" strokeWidth={3} />
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
