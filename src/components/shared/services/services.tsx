import { BugIcon, NetworkIcon, RadarIcon, ScanSearchIcon, WorkflowIcon } from 'lucide-react'
import Eyebrow from '@/components/shared/eyebrow/eyebrow'

const FOCUS_AREAS = [
  {
    title: 'Digital Forensics & Incident Response',
    description: 'Evidence-driven investigation, network analysis, incident-response fundamentals and clear technical documentation.',
    tools: ['Wireshark', 'Windows', 'Linux'],
    icon: ScanSearchIcon
  },
  {
    title: 'Ethical Hacking & Web Security',
    description: 'Practical testing focused on attack paths, exposed services, application behaviour and reproducible findings.',
    tools: ['Burp Suite', 'Nmap', 'Recon'],
    icon: BugIcon
  },
  {
    title: 'Threat Research & Monitoring',
    description: 'Collecting, normalising and interpreting public threat intelligence with careful source attribution.',
    tools: ['OSINT', 'Threat feeds', 'Automation'],
    icon: RadarIcon
  },
  {
    title: 'Infrastructure & Web Security',
    description: 'Security-focused infrastructure work spanning DNS, certificates, edge controls, hosting and web hardening.',
    tools: ['Cloudflare', 'DNS', 'TLS'],
    icon: NetworkIcon
  },
  {
    title: 'Security Automation',
    description: 'Small tools and automation that reduce repetitive security work and make technical processes more reliable.',
    tools: ['Python', 'PowerShell', 'APIs'],
    icon: WorkflowIcon
  }
]

const Services = () => (
  <section id='services' className='border-b py-10 sm:py-16 lg:py-24'>
    <div className='mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:space-y-12 lg:px-10.5'>
      <div className='max-w-2xl space-y-3'>
        <Eyebrow>Security focus</Eyebrow>
        <h2 className='text-2xl font-semibold tracking-tight md:text-3xl lg:text-4xl'>The areas I keep going deeper into</h2>
        <p className='text-muted-foreground text-base leading-relaxed sm:text-lg'>A practical mix of investigation, offensive testing, infrastructure security and automation — without stock imagery pretending to be the work.</p>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        {FOCUS_AREAS.map((area, index) => {
          const Icon = area.icon
          const wide = index === FOCUS_AREAS.length - 1

          return (
            <article
              key={area.title}
              className={`ring-border group relative overflow-hidden rounded-[24px] bg-card p-5 shadow-sm ring-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-6 ${wide ? 'md:col-span-2' : ''}`}
            >
              <div className='absolute -right-12 -top-12 size-36 rounded-full bg-orange-500/5 blur-3xl transition-opacity duration-300 group-hover:bg-orange-500/10' />

              <div className={`relative z-10 ${wide ? 'md:grid md:grid-cols-[auto_1fr_auto] md:items-center md:gap-6' : ''}`}>
                <div className='bg-background ring-border mb-5 flex size-11 items-center justify-center rounded-2xl ring-1 md:mb-0'>
                  <Icon className='size-5 text-orange-500' strokeWidth={1.8} />
                </div>

                <div>
                  <p className='text-muted-foreground text-xs font-semibold uppercase tracking-[0.14em]'>0{index + 1}</p>
                  <h3 className='mt-1 text-xl font-semibold'>{area.title}</h3>
                  <p className='text-muted-foreground mt-3 max-w-xl text-sm leading-relaxed sm:text-base'>{area.description}</p>
                </div>

                <div className={`mt-5 flex flex-wrap gap-2 ${wide ? 'md:mt-0 md:max-w-56 md:justify-end' : ''}`}>
                  {area.tools.map(tool => (
                    <span key={tool} className='bg-background ring-border rounded-full px-2.5 py-1.5 text-xs font-medium ring-1'>
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  </section>
)

export default Services
