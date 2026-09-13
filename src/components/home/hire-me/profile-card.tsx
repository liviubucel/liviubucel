import { useRef, useState } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'motion/react'
import { MapPinIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import AvailabilityBadge from '@/components/shared/availability-badge'
import { cn } from '@/lib/utils'

const STATS = [{ label: 'Focus', value: 'DFIR' },{ label: 'Track', value: 'Web' },{ label: 'Base', value: 'UK' }]
const ProfileCard = ({ className }: { className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start end', 'end start'] })
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 20, mass: 0.5 })
  const rotate = useTransform(progress, [0, 0.5, 1], [-4, 0, 4])
  return (
    <div ref={containerRef} className={cn('bg-background flex flex-col justify-between rounded-2xl border p-6', className)}>
      <motion.div style={{ rotate }} className='-ml-4 origin-bottom perspective-[1500px] sm:w-88 md:-ml-9 md:w-68 lg:-ml-9 lg:w-88'>
        <div role='button' tabIndex={0} aria-pressed={isFlipped} onClick={() => setIsFlipped(prev => !prev)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setIsFlipped(prev => !prev) } }} className={cn('relative cursor-pointer transition-transform duration-700 transform-3d', isFlipped && 'transform-[rotateY(180deg)]')}>
          <Card className='shadow-lg ring-0 backface-hidden dark:ring dark:ring-white/20'><CardContent className='space-y-4'><div className='flex items-start gap-4'><div className='flex grow flex-col items-center gap-4'><div className='relative'><Avatar className='size-30'><AvatarImage src='/images/hire-me/profile.webp' alt='Liviu Bucel' /><AvatarFallback>LB</AvatarFallback></Avatar><span className='absolute -bottom-3 left-[50%] flex size-7.5 -translate-x-1/2 items-center justify-center'><img src='/images/hire-me/profile-star-icon.webp' alt='Verified' /></span></div><div><h3 className='text-xl font-semibold lg:text-[36px]'>Liviu Bucel</h3><p className='text-muted-foreground flex items-center justify-center gap-1 text-base font-medium'><MapPinIcon className='fill-muted-foreground text-card size-5' />United Kingdom</p></div></div><div className='divide-border divide-y text-center'>{STATS.map(stat => <div key={stat.label} className='py-1.5 first:pt-0 last:pb-0'><p className='text-foreground text-xl font-semibold lg:text-[26px]'>{stat.value}</p><p className='text-base'>{stat.label}</p></div>)}</div></div></CardContent></Card>
          <Card style={{ backgroundImage: "url('/images/hire-me/card-back-bg.webp')" }} className='absolute inset-0 transform-[rotateY(180deg)] overflow-hidden rounded-[24px] bg-black bg-cover bg-center text-white shadow-lg ring-0 backface-hidden dark:ring dark:ring-white/20'><CardContent className='relative flex h-full flex-col justify-between gap-6'><div><p className='text-xs text-white/60'>Liviu Bucel</p><h3 className='text-base font-medium'>IT & security background</h3></div><div className='flex items-end justify-between gap-3'><p className='text-base'>I care about evidence, clear reasoning and understanding systems before changing them.</p><Avatar className='h-24.5 w-20.5 shrink-0 rounded-[12px]'><AvatarImage src='/images/hire-me/profile.webp' alt='Liviu Bucel' className='rounded-[12px]' /><AvatarFallback>LB</AvatarFallback></Avatar></div></CardContent></Card>
        </div>
      </motion.div>
      <div className='mt-6 space-y-3'><AvailabilityBadge className='h-6.5 gap-1 rounded-full' /><p className='mb-2 text-xl font-medium sm:text-2xl lg:text-[30px]'>Open to cybersecurity opportunities</p><p className='text-muted-foreground text-base'>DFIR, ethical hacking, security testing, incident response and hands-on technical roles.</p></div>
    </div>
  )
}
export default ProfileCard
