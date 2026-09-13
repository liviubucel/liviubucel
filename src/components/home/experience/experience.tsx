import Timeline from '@/components/ui/timeline'
import ExperienceTimelineItem from '@/components/home/experience/experience-timeline-item'

const EXPERIENCES = [
  {
    index: '01',
    company: 'ZebraByte',
    role: 'Technical Support Specialist',
    period: 'Apr 2022 – Jan 2024 · United Kingdom',
    stack: ['cPanel', 'DNS', 'Email', 'ACME', 'Let’s Encrypt', 'WordPress', 'Cloudflare'],
    achievement: 'Supported hosting environments, domain routing, SSL deployment, and client infrastructure.',
    description:
      'Provided Level 1 technical support across web-hosting environments, troubleshot DNS and email delivery, configured cPanel accounts, supported WordPress deployments, and handled SSL certificate installation and renewal.'
  },
  {
    index: '02',
    company: 'Intact Media Group',
    role: 'IT Technician',
    period: 'Nov 2019 – Sep 2020 · Bucharest, Romania',
    stack: ['Windows', 'Networking', 'Workstations', 'Email', 'IT Support'],
    achievement: 'Delivered frontline IT support in a fast-paced media production environment.',
    description:
      'Troubleshot workstation, application, email, and network-connectivity issues, configured user systems, supported internal applications, and escalated complex incidents to infrastructure teams.'
  },
  {
    index: '03',
    company: 'Independent Labs',
    role: 'Practical Cybersecurity Work',
    period: 'Ongoing',
    status: { text: 'Hands-on', tone: 'accent' as const },
    stack: ['Kali Linux', 'Burp Suite', 'Wireshark', 'Nmap', 'Python', 'PowerShell'],
    achievement: 'Building practical depth across threat analysis, security testing, reconnaissance, and incident-response fundamentals.',
    description:
      'Hands-on work includes threat-analysis simulations, phishing and awareness exercises, controlled Python security exercises, Linux/Windows labs, networking, reconnaissance, enumeration, and incident-response practice.'
  }
]

const ExperienceTimeline = () => {
  return (
    <Timeline
      data={EXPERIENCES.map(({ index, ...experience }) => ({
        index,
        content: <ExperienceTimelineItem {...experience} />
      }))}
    />
  )
}

export default ExperienceTimeline
