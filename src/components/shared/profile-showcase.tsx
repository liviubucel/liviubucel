import type { MouseEvent } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import GithubIcon from '@/assets/svg/github-icon'
import LinkedinIcon from '@/assets/svg/linkedin-icon'
import MailIcon from '@/assets/svg/mail'
import { Button } from '@/components/ui/button'
import AvailabilityBadge from '@/components/shared/availability-badge'
import { cn } from '@/lib/utils'

const SOCIALS = [
  { label: 'Github', icon: GithubIcon, href: 'https://github.com/liviubucel' },
  { label: 'LinkedIn', icon: LinkedinIcon, href: 'https://www.linkedin.com/in/liviubucel/' },
  { label: 'Email', icon: MailIcon, href: 'mailto:contact@liviubucel.com' }
]

type ProfileShowcaseProps = { className?: string; backgroundImageClassName?: string; profileImageClassName?: string }
const ProfileShowcase = ({ className, backgroundImageClassName, profileImageClassName }: ProfileShowcaseProps) => {
  const mouseX = useMotionValue(0.5), mouseY = useMotionValue(0.5)
  const springX = useSpring(mouseX, { stiffness: 150, damping: 20, mass: 0.5 }), springY = useSpring(mouseY, { stiffness: 150, damping: 20, mass: 0.5 })
  const translateX = useTransform(springX, [0, 1], [20, -20]), translateY = useTransform(springY, [0, 1], [20, -20])
  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => { const bounds = event.currentTarget.getBoundingClientRect(); mouseX.set((event.clientX - bounds.left) / bounds.width); mouseY.set((event.clientY - bounds.top) / bounds.height) }
  const handleMouseLeave = () => { mouseX.set(0.5); mouseY.set(0.5) }
  return (
    <div className={cn('flex flex-col justify-end overflow-hidden', className)}>
      <div className='relative w-full flex-1 overflow-hidden rounded-3xl'>
        <img src='/images/services/service-bg.webp' alt='' className={cn('object-cover', backgroundImageClassName)} />
        <motion.div className='absolute bottom-0 max-lg:left-1/2 max-lg:-translate-x-1/2' style={{ x: translateX, y: translateY }} whileHover={{ scale: 1.1 }} transition={{ scale: { duration: 0.4, ease: 'easeOut' } }} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}><img src='/images/services/services-profile.webp' alt='Liviu Bucel' className={cn('object-cover', profileImageClassName)} /></motion.div>
        <div className='absolute inset-x-0 bottom-0 flex justify-center'><AvailabilityBadge className='h-7.5 gap-1.5 rounded-[12px] rounded-b-none border-0 px-3 py-1 text-sm uppercase' /></div>
      </div>
      <div className='flex flex-col items-center justify-between gap-1.5 px-5 py-4'>
        <p className='flex items-center gap-2 font-medium'>Liviu Bucel<span className='bg-muted-foreground inline-block size-2 rounded-full' /><span className='text-muted-foreground font-normal'>Cybersecurity & DFIR</span></p>
        <div className='flex items-center gap-1'>{SOCIALS.map(({ label, icon: Icon, href }) => <Button key={label} variant='ghost' size='icon-sm' aria-label={label} className='text-muted-foreground/80 hover:bg-transparent dark:hover:bg-transparent' render={<a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined} />} nativeButton={false}><Icon className='size-4.5' /></Button>)}</div>
      </div>
    </div>
  )
}
export default ProfileShowcase
