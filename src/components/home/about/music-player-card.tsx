import { useState } from 'react'

import { RadarIcon, ScanSearchIcon, ShieldCheckIcon } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const MusicPlayerCard = () => {
  const [expanded, setExpanded] = useState(true)

  return (
    <Card
      onClick={() => setExpanded(prev => !prev)}
      data-cursor='pointer'
      className='ring-border relative cursor-pointer gap-0 overflow-hidden rounded-[24px] bg-(--background-darker) p-0 shadow-none'
    >
      <div
        className={cn(
          'relative overflow-hidden bg-neutral-950 transition-all duration-500',
          expanded ? 'h-32 rounded-[0_0_50%_50%/0_0_70%_70%]' : 'h-full rounded-b-[16px] max-lg:min-h-80 max-md:min-h-55'
        )}
      >
        <div className='absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:24px_24px]' />
        <div className='absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,92,0,.32),transparent_42%)]' />
        <div className='relative z-10 flex h-full items-center justify-center gap-3 text-white'>
          <div className='rounded-2xl border border-white/15 bg-white/8 p-3 backdrop-blur-sm'>
            <RadarIcon className='size-7' />
          </div>
          <div className='space-y-1'>
            <p className='text-[11px] uppercase tracking-[0.18em] text-white/55'>Security workflow</p>
            <div className='flex items-center gap-2 text-sm font-medium'>
              <ScanSearchIcon className='size-4 text-orange-400' />
              Investigate
              <span className='text-white/30'>→</span>
              Verify
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'absolute top-0 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 transition-all duration-500',
          expanded ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div className='ring-background/40 flex size-8 items-center justify-center rounded-full bg-neutral-950 text-white ring-2'>
          <ShieldCheckIcon className='size-4' />
        </div>
      </div>

      <div className={cn('grid transition-[grid-template-rows] duration-500', expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className='overflow-hidden'>
          <div className={cn('space-y-2 px-4 py-4 text-center transition-all duration-500', expanded ? 'opacity-100 blur-none' : 'opacity-0 blur-sm')}>
            <p className='text-muted-foreground text-xs'>Current focus</p>
            <p className='text-sm font-medium'>DFIR & Ethical Hacking</p>
            <div className='mx-auto flex w-fit items-center gap-1.5 text-[11px] text-muted-foreground'>
              <span>Evidence-led</span>
              <span className='size-1 rounded-full bg-orange-500' />
              <span>Hands-on</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default MusicPlayerCard
