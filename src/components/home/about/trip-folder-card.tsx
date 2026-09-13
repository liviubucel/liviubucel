import { useState } from 'react'

import { TerminalIcon } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const LABS = [
  {
    eyebrow: 'WEB',
    title: 'Burp Suite',
    detail: 'request analysis',
    collapsed: 'rotate-[2deg] -translate-y-[48%]',
    hover: 'group-hover/folder:rotate-[3deg] group-hover/folder:-translate-y-[52%] group-hover/folder:translate-x-1 group-hover/folder:scale-90',
    expanded: '-translate-x-16 -rotate-[10deg] -translate-y-18 scale-110'
  },
  {
    eyebrow: 'DFIR',
    title: 'Wireshark',
    detail: 'traffic analysis',
    collapsed: '-translate-y-[43%]',
    hover: 'group-hover/folder:-translate-y-[47%] group-hover/folder:scale-90',
    expanded: '-translate-y-18 scale-110'
  },
  {
    eyebrow: 'NET',
    title: 'Nmap',
    detail: 'recon & enumeration',
    collapsed: '-rotate-[2deg] -translate-y-[38%]',
    hover: 'group-hover/folder:-rotate-[3deg] group-hover/folder:-translate-y-[42%] group-hover/folder:-translate-x-1 group-hover/folder:scale-90',
    expanded: 'translate-x-16 -translate-y-16 rotate-[10deg] scale-110'
  }
]

const TripFolderCard = () => {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card
      onClick={() => setExpanded(prev => !prev)}
      data-cursor='pointer'
      className='ring-border cursor-pointer justify-end gap-5 overflow-visible rounded-[24px] bg-(--background-darker) shadow-none'
    >
      <CardContent>
        <div className='group/folder relative flex aspect-video items-end justify-center'>
          <div className='dark:border-primary/10 absolute bottom-0 left-1/2 z-0 h-36 w-40 -translate-x-1/2 rounded-xl border bg-(--background-darker)' />

          {LABS.map((lab, i) => (
            <div
              key={lab.title}
              style={{ zIndex: i + 1 }}
              className={cn(
                'absolute h-28 w-36 overflow-hidden rounded-xl border border-border/80 bg-background p-3 shadow-lg transition-all duration-500',
                expanded ? lab.expanded : cn(lab.collapsed, lab.hover)
              )}
            >
              <div className='flex items-start justify-between gap-2'>
                <span className='rounded-md bg-orange-500/10 px-1.5 py-1 text-[9px] font-semibold tracking-[0.16em] text-orange-600 dark:text-orange-400'>
                  {lab.eyebrow}
                </span>
                <TerminalIcon className='size-4 text-muted-foreground' />
              </div>
              <p className='mt-4 text-sm font-semibold leading-none'>{lab.title}</p>
              <p className='mt-1 text-[10px] text-muted-foreground'>{lab.detail}</p>
              <div className='mt-3 h-1 w-full overflow-hidden rounded-full bg-muted'>
                <div className='h-full w-2/3 rounded-full bg-orange-500/70' />
              </div>
            </div>
          ))}

          <div
            className={cn(
              'relative z-10 origin-bottom transform-[perspective(2000px)_rotateX(-25deg)] transition-transform duration-500',
              !expanded && 'hover:transform-[perspective(3000px)_rotateX(-35deg)]',
              expanded && 'transform-[perspective(4000px)_rotateX(-45deg)]'
            )}
          >
            <img src='/images/about-me/folder-front.webp' alt='Security lab folder' className='w-40' />
          </div>
        </div>
      </CardContent>

      <CardContent>
        <div className='flex items-center justify-center gap-3'>
          <p className='text-foreground text-xl font-medium text-nowrap xl:text-[26px]'>Security labs</p>
          <Badge variant='secondary' className='text-muted dark:bg-background dark:text-primary/70 h-6.5 rounded-sm bg-white font-light'>
            Hands-on
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

export default TripFolderCard
