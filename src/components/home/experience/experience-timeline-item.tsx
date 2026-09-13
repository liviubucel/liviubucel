import { CalendarDaysIcon, CheckCircle2Icon, Layers3Icon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type ExperienceTimelineItemProps = {
  logo?: string
  company: string
  role: string
  period: string
  status?: { text: string; tone: 'positive' | 'accent' }
  stack: string[]
  achievement: string
  description: string
}

const ExperienceTimelineItem = ({ logo, company, role, period, status, stack, achievement, description }: ExperienceTimelineItemProps) => {
  const initials = company
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase()

  return (
    <div className='space-y-5'>
      <div className='flex items-center gap-3'>
        <div className='bg-background ring-border flex size-13 shrink-0 items-center justify-center overflow-hidden rounded-2xl ring-1 sm:size-14'>
          {logo ? (
            <img src={logo} alt='' className='size-full object-cover' />
          ) : (
            <span className='text-sm font-semibold tracking-wide'>{initials}</span>
          )}
        </div>
        <div>
          <p className='text-muted-foreground text-sm'>{company}</p>
          <h3 className='text-lg font-semibold sm:text-2xl'>{role}</h3>
        </div>
      </div>

      <div className='space-y-3 text-sm sm:text-base'>
        <div className='text-muted-foreground flex items-center gap-2'>
          <CalendarDaysIcon className='size-4.5 shrink-0' strokeWidth={1.8} />
          <span>
            {period}
            {status && (
              <span className={cn('ml-2 font-medium', status.tone === 'positive' ? 'text-green-600 dark:text-green-400' : 'text-accent')}>
                {status.text}
              </span>
            )}
          </span>
        </div>

        <div className='flex items-start gap-2'>
          <Layers3Icon className='text-muted-foreground mt-0.5 size-4.5 shrink-0' strokeWidth={1.8} />
          <div className='flex flex-wrap gap-2'>
            {stack.map(tech => (
              <Badge key={tech} variant='secondary' className='text-foreground rounded-full bg-(--background-darker)'>
                {tech}
              </Badge>
            ))}
          </div>
        </div>

        <div className='flex items-start gap-2 font-medium'>
          <CheckCircle2Icon className='text-accent mt-0.5 size-4.5 shrink-0' strokeWidth={1.8} />
          <span>{achievement}</span>
        </div>
      </div>

      <p className='text-muted-foreground max-w-2xl pl-6 leading-relaxed'>{description}</p>
    </div>
  )
}

export default ExperienceTimelineItem
