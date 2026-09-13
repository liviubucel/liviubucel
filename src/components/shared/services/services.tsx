import { MinusIcon, PlusIcon } from 'lucide-react'

import Eyebrow from '@/components/shared/eyebrow/eyebrow'
import { Accordion, AccordionItem, AccordionContent, AccordionTrigger } from '@/components/ui/accordion'

const FOCUS_AREAS = [
  {
    title: 'Digital Forensics & Incident Response',
    tools: ['Evidence', 'Timeline analysis', 'Wireshark', 'Windows', 'Linux'],
    description:
      'Understanding what happened, preserving useful evidence, reconstructing activity, and turning technical findings into clear remediation steps.'
  },
  {
    title: 'Ethical Hacking & Security Testing',
    tools: ['Burp Suite', 'Nmap', 'Recon', 'Enumeration', 'Web security'],
    description:
      'Hands-on security testing focused on attack paths, exposed services, application behaviour, and vulnerabilities that can be reproduced and explained.'
  },
  {
    title: 'Threat Research & Monitoring',
    tools: ['OSINT', 'Threat feeds', 'Normalization', 'Automation', 'Cyber Monitor'],
    description:
      'Collecting and correlating public threat intelligence, separating claims from confirmed facts, and building monitoring workflows around actionable data.'
  },
  {
    title: 'Infrastructure & Web Security',
    tools: ['Cloudflare', 'DNS', 'TLS/SSL', 'ACME', 'Hosting'],
    description:
      'Practical experience around DNS, certificates, web infrastructure, hosting environments, and defensive controls at the edge.'
  },
  {
    title: 'Security Automation',
    tools: ['Python', 'PowerShell', 'Workers', 'APIs', 'Scripting'],
    description:
      'Using code to reduce repetitive security work, process data, validate assumptions, and build small tools that make investigations or operations faster.'
  }
]

const Services = () => {
  return (
    <section id='security-focus' className='border-b py-8 sm:py-16 lg:py-24'>
      <div className='mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:space-y-16 lg:px-10.5'>
        <div className='space-y-2'>
          <Eyebrow>Security focus</Eyebrow>
          <h2 className='text-2xl font-semibold md:text-3xl lg:text-4xl'>The areas I keep going deeper into</h2>
        </div>

        <Accordion className='divide-y'>
          {FOCUS_AREAS.map((area, index) => (
            <AccordionItem key={area.title} value={index}>
              <AccordionTrigger className='text-primary items-center border-0 py-4 text-lg hover:no-underline **:data-[slot=accordion-trigger-icon]:hidden sm:text-xl lg:text-[26px]'>
                <span>
                  {String(index + 1).padStart(2, '0')}. {area.title}
                </span>
                <span className='bg-card relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full'>
                  <PlusIcon className='text-accent size-4 rotate-0 opacity-100 transition-all duration-300 group-aria-expanded/accordion-trigger:rotate-90 group-aria-expanded/accordion-trigger:opacity-0' />
                  <MinusIcon className='text-accent absolute size-4 -rotate-90 opacity-0 transition-all duration-300 group-aria-expanded/accordion-trigger:rotate-0 group-aria-expanded/accordion-trigger:opacity-100' />
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className='mt-2 space-y-4 pb-2'>
                  <div className='flex flex-wrap items-center gap-2'>
                    {area.tools.map(tool => (
                      <span key={tool} className='bg-(--background-darker) rounded-full px-3 py-1 text-xs font-medium'>
                        {tool}
                      </span>
                    ))}
                  </div>
                  <p className='text-muted-foreground max-w-3xl text-base'>{area.description}</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}

export default Services
