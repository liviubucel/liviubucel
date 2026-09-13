import { useEffect, useState } from 'react'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

const GREETINGS = [
  'Hello', 'Salut', 'Bonjour', 'Hola', 'Ciao', 'Hallo', 'Olá', 'Hej', 'Hei', 'Halló',
  'Cześć', 'Ahoj', 'Szia', 'Bună', 'Γεια σου', 'Merhaba', 'Привіт', 'Привет', 'Здраво',
  'مرحبا', 'שלום', 'سلام', 'नमस्ते', 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ', '你好', 'こんにちは', '안녕하세요', 'สวัสดี',
  'Xin chào', 'Halo', 'Kamusta', 'Jambo', 'Sawubona', 'Molo', 'Kia ora', 'Talofa', 'Aloha'
]
const INTERVAL_MS = 1700

const GreetingWord = () => {
  const [index, setIndex] = useState(0)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    if (shouldReduceMotion) return

    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % GREETINGS.length)
    }, INTERVAL_MS)

    return () => clearInterval(timer)
  }, [])

  return (
    <span className='mr-2 inline-grid overflow-hidden align-bottom'>
      {/* Invisible sizers reserve space for the widest greeting so surrounding text doesn't shift */}
      {GREETINGS.map(word => (
        <span key={word} className='invisible col-start-1 row-start-1 whitespace-nowrap' aria-hidden='true'>
          {word}
        </span>
      ))}

      <AnimatePresence mode='popLayout' initial={false}>
        <motion.span
          key={GREETINGS[index]}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className='col-start-1 row-start-1 inline-block whitespace-nowrap'
        >
          {GREETINGS[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export default GreetingWord
