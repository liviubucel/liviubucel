import { Card, CardContent } from '@/components/ui/card'

const GROUPS = [
  {
    title: 'Offensive security',
    items: ['Burp Suite', 'Nmap', 'Reconnaissance', 'Enumeration', 'Web security testing']
  },
  {
    title: 'Investigation & analysis',
    items: ['Wireshark', 'DFIR fundamentals', 'Threat analysis', 'Incident response', 'Evidence handling']
  },
  {
    title: 'Systems & automation',
    items: ['Kali Linux', 'Linux', 'Windows', 'Python', 'PowerShell', 'Cloudflare']
  }
]

const ActivityCard = () => {
  return (
    <Card className='ring-border gap-6 rounded-3xl p-6 shadow-lg lg:mb-16'>
      <CardContent className='space-y-6 p-0'>
        <div>
          <p className='text-sm font-semibold'>Practical security toolkit</p>
          <p className='text-muted-foreground mt-1 text-sm'>Tools and areas I use across labs, projects, support, and security research.</p>
        </div>
        <div className='grid gap-4 md:grid-cols-3'>
          {GROUPS.map(group => (
            <div key={group.title} className='bg-(--background-darker) rounded-2xl p-4'>
              <p className='font-semibold'>{group.title}</p>
              <div className='mt-3 flex flex-wrap gap-2'>
                {group.items.map(item => (
                  <span key={item} className='bg-background rounded-full border px-2.5 py-1 text-xs font-medium'>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default ActivityCard
