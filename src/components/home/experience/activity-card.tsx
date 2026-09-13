import { BinocularsIcon, NetworkIcon, SearchCodeIcon, TerminalSquareIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const TOOL_GROUPS = [
  {
    title: 'Offensive security',
    description: 'Reconnaissance, enumeration, web testing and attack-path validation.',
    tools: ['Burp Suite', 'Nmap', 'Kali Linux'],
    icon: SearchCodeIcon
  },
  {
    title: 'Investigation & analysis',
    description: 'Network evidence, incident triage, digital-forensics fundamentals and threat analysis.',
    tools: ['Wireshark', 'Windows', 'Linux'],
    icon: BinocularsIcon
  },
  {
    title: 'Systems & infrastructure',
    description: 'DNS, TLS, hosting, edge controls and practical hardening work.',
    tools: ['Cloudflare', 'DNS', 'TLS/SSL'],
    icon: NetworkIcon
  },
  {
    title: 'Automation',
    description: 'Small scripts and API-driven workflows for repeatable security tasks.',
    tools: ['Python', 'PowerShell', 'APIs'],
    icon: TerminalSquareIcon
  }
]

const ActivityCard = () => (
  <Card className='ring-border overflow-hidden rounded-[26px] p-0 shadow-sm'>
    <CardContent className='p-0'>
      <div className='border-b p-5 sm:p-7'>
        <p className='text-muted-foreground text-xs font-semibold uppercase tracking-[0.16em]'>Practical toolkit</p>
        <h3 className='mt-2 text-2xl font-semibold'>The tools matter less than knowing why you are using them.</h3>
        <p className='text-muted-foreground mt-3 max-w-2xl text-sm leading-relaxed sm:text-base'>I use a compact set of tools across offensive testing, investigation, infrastructure and automation — and keep the emphasis on reproducible evidence rather than tool collecting.</p>
      </div>

      <div className='grid md:grid-cols-2'>
        {TOOL_GROUPS.map((group, index) => {
          const Icon = group.icon
          return (
            <div key={group.title} className={`p-5 sm:p-6 ${index % 2 === 0 ? 'md:border-r' : ''} ${index < 2 ? 'border-b' : ''}`}>
              <div className='flex items-start gap-4'>
                <div className='bg-background ring-border flex size-10 shrink-0 items-center justify-center rounded-xl ring-1'>
                  <Icon className='size-4.5 text-orange-500' strokeWidth={1.8} />
                </div>
                <div className='min-w-0'>
                  <h4 className='font-semibold'>{group.title}</h4>
                  <p className='text-muted-foreground mt-1 text-sm leading-relaxed'>{group.description}</p>
                  <div className='mt-4 flex flex-wrap gap-2'>
                    {group.tools.map(tool => (
                      <span key={tool} className='bg-muted rounded-full px-2.5 py-1 text-xs font-medium'>{tool}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </CardContent>
  </Card>
)

export default ActivityCard
