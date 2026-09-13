import { useState } from 'react'

import { cn } from '@/lib/utils'

const NOTES = [
  { text: 'Start with evidence', position: 'top-[12%] left-[12%] rotate-[-8deg]' },
  { text: 'Reproduce before you assume', position: 'top-[10%] left-[58%] rotate-[8deg]' },
  { text: 'Read the logs :)', position: 'top-[12%] left-[8%] rotate-[-5deg]' },
  { text: 'Verify the fix', position: 'top-[46%] left-[66%] rotate-[10deg]' },
  { text: 'Document what matters', position: 'top-[40%] left-[34%] rotate-[3deg]' },
  { text: 'Keep digging', position: 'top-[8%] left-[6%] rotate-[-8deg]' }
]

const SurpriseNote = () => {
  const [step, setStep] = useState(0)
  const note = NOTES[step]

  return (
    <div className='relative h-full overflow-hidden'>
      <div className='bg-background absolute top-8 right-[16%] left-[16%] h-2 rounded-full' />

      <div
        onMouseEnter={() => setStep(prev => (prev + 1) % NOTES.length)}
        data-cursor='pointer'
        className={cn('absolute z-20 w-28 cursor-pointer transition-all duration-500 xl:w-32', note.position)}
      >
        <img src='/images/about-me/note.webp' alt='Security note' className='w-full' />
        <p className='absolute inset-0 flex items-center justify-center px-3 text-center text-sm leading-tight [font-family:var(--font-handwritten)] text-neutral-800'>
          {note.text}
        </p>
      </div>

      <div className='absolute inset-x-0 bottom-5 px-6 text-center'>
        <p className='text-card-foreground text-xl font-medium sm:text-2xl'>A few rules I work by 🙃</p>
        <p className='text-muted-foreground mt-1 text-xs'>Hover the note</p>
      </div>
    </div>
  )
}

export default SurpriseNote
