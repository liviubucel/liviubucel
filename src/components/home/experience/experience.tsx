import Timeline from '@/components/ui/timeline'
import ExperienceTimelineItem from '@/components/home/experience/experience-timeline-item'

const EXPERIENCES = [
  {
    index: '01',
    logo: '/illustrations/shield_logo.webp',
    company: 'ZebraByte',
    role: 'Technical Support Specialist',
    period: 'Apr 2022 — Jan 2024',
    stack: ['cPanel', 'DNS', 'TLS/SSL', 'WordPress', 'Cloudflare'],
    achievement: 'Supported hosting, domains, email and client infrastructure while building a stronger security focus.',
    description: 'Worked on first-line technical support across hosting and web infrastructure, including DNS, email, SSL/ACME certificate workflows, WordPress and Cloudflare fundamentals.'
  },
  {
    index: '02',
    company: 'Intact Media Group',
    role: 'IT Technician',
    period: 'Nov 2019 — Sep 2020',
    stack: ['Windows', 'Networking', 'Workstations', 'Email'],
    achievement: 'Supported day-to-day IT operations across user devices, networking and workplace systems.',
    description: 'Handled practical IT support in a production environment, troubleshooting Windows workstations, network connectivity, email and everyday technical issues.'
  },
  {
    index: '03',
    logo: '/illustrations/roman_shield.webp',
    company: 'Independent Labs',
    role: 'Practical Cybersecurity Work',
    period: 'Ongoing',
    status: { text: 'Hands-on', tone: 'accent' as const },
    stack: ['Kali Linux', 'Burp Suite', 'Nmap', 'Wireshark', 'Python'],
    achievement: 'Hands-on work across reconnaissance, enumeration, web testing, network analysis and incident-response fundamentals.',
    description: 'Security labs and simulations are where I test assumptions, reproduce behaviour, collect evidence and practise documenting findings clearly.'
  }
]

const ExperienceTimeline = () => (
  <Timeline data={EXPERIENCES.map(({ index, ...experience }) => ({ index, content: <ExperienceTimelineItem {...experience} /> }))} />
)

export default ExperienceTimeline
