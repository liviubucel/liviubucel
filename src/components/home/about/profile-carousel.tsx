import { useState } from 'react'

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

const IMAGES = [
  '/images/about-me/carousel-01.webp',
  '/images/about-me/carousel-02.webp',
  '/images/about-me/carousel-03.webp',
  '/images/about-me/carousel-04.webp'
]

const ProfileCarousel = () => {
  const [index, setIndex] = useState(0)

  const goPrev = () => setIndex(prev => (prev - 1 + IMAGES.length) % IMAGES.length)
  const goNext = () => setIndex(prev => (prev + 1) % IMAGES.length)

  return (
    <div className='ring-border relative row-span-2 h-130 overflow-hidden rounded-[24px] bg-neutral-950 ring-1'>
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(255,92,0,0.20),transparent_46%)]' />
      <div className='absolute inset-x-8 top-8 h-px bg-white/10' />

      {IMAGES.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={`Liviu Bucel profile illustration ${i + 1}`}
          className={cn(
            'absolute inset-0 size-full object-contain px-8 pt-12 pb-24 drop-shadow-2xl transition-all duration-500',
            i === index ? 'scale-100 opacity-100' : 'scale-[0.98] opacity-0'
          )}
        />
      ))}

      <div className='absolute top-7 right-8 z-20 flex gap-1'>
        {IMAGES.map((src, i) => (
          <span
            key={src}
            className={cn(
              'block h-1 rounded-full bg-white transition-all duration-300',
              i === index ? 'w-5 opacity-100' : 'w-2 opacity-35'
            )}
          />
        ))}
      </div>

      <div className='absolute inset-x-0 bottom-0 z-10 bg-linear-to-t from-black via-black/85 to-transparent px-6 pt-16 pb-6 text-white'>
        <p className='text-lg font-semibold'>Liviu Bucel</p>
        <div className='mt-1 flex items-center justify-between gap-4'>
          <p className='text-sm text-white/65'>Cybersecurity & DFIR</p>
          <span className='rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-white/70'>UK</span>
        </div>
      </div>

      <button
        type='button'
        onClick={goPrev}
        aria-label='Previous profile illustration'
        className='group/prev absolute inset-y-0 left-0 z-20 flex w-1/4 items-center justify-start pl-3 outline-none'
      >
        <span className='absolute inset-0 bg-linear-to-r from-black/35 to-transparent opacity-0 transition-opacity duration-300 group-hover/prev:opacity-100' />
        <ChevronLeftIcon className='relative size-5 -translate-x-2 text-white opacity-0 transition-all duration-300 group-hover/prev:translate-x-0 group-hover/prev:opacity-100' />
      </button>

      <button
        type='button'
        onClick={goNext}
        aria-label='Next profile illustration'
        className='group/next absolute inset-y-0 right-0 z-20 flex w-1/4 items-center justify-end pr-3 outline-none'
      >
        <span className='absolute inset-0 bg-linear-to-l from-black/35 to-transparent opacity-0 transition-opacity duration-300 group-hover/next:opacity-100' />
        <ChevronRightIcon className='relative size-5 translate-x-2 text-white opacity-0 transition-all duration-300 group-hover/next:translate-x-0 group-hover/next:opacity-100' />
      </button>
    </div>
  )
}

export default ProfileCarousel
