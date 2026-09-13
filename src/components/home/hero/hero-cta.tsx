import { ArrowRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

const HeroCta = () => (
  <div className='flex flex-wrap items-center gap-2.5 pt-2'>
    <Button
      className='group/button h-11 gap-2 rounded-full px-5 text-base'
      render={
        <a href='/projects'>
          View my work
          <ArrowRightIcon className='size-4 transition-transform duration-300 group-hover/button:translate-x-0.5' />
        </a>
      }
      nativeButton={false}
    />

    <Button
      variant='outline'
      className='bg-background/80 hover:bg-card h-11 rounded-full px-5 text-base shadow-sm backdrop-blur'
      render={<a href='/contact'>Contact me</a>}
      nativeButton={false}
    />
  </div>
)

export default HeroCta
