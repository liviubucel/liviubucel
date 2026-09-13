import { useState } from 'react'
import type { FormEvent } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type DetailsStepProps = { service: { title: string; price: string; duration: string } | undefined; date: Date | undefined; time: string | null; onSuccess: (name: string) => void }
const DetailsStep = ({ service, date, time, onSuccess }: DetailsStepProps) => {
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [notes, setNotes] = useState(''), [sending, setSending] = useState(false)
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSending(true)
    try {
      const form = new FormData(); form.set('name', name); form.set('email', email); form.set('topic', 'General Question'); form.set('consent', 'on'); form.set('message', `Topic: ${service?.title ?? 'Cybersecurity'}\nPreferred time: ${date && time ? `${format(date, 'EEE, MMM d')} · ${time}` : 'Not specified'}\n\n${notes || 'No additional notes.'}`)
      const response = await fetch('/api/contact', { method: 'POST', body: form }); const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Unable to send message')
      toast.success("Message sent — I'll get back to you as soon as possible."); onSuccess(name); setName(''); setEmail(''); setNotes('')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to send message') } finally { setSending(false) }
  }
  const serviceValue = service ? `${service.title} · ${service.duration}` : '—', dateTimeValue = date && time ? `${format(date, 'EEE, MMM d')} · ${time}` : '—'
  return <div className='space-y-4'><div className='space-y-3 rounded-xl bg-(--background-darker) p-4'><div className='flex items-start gap-2'><span className='bg-accent mt-1.5 size-2.5 shrink-0 rounded-full' /><div><p className='text-muted-foreground text-[10px] tracking-wide uppercase'>Topic</p><p className='text-sm font-semibold'>{serviceValue}</p></div></div><div className='flex items-start gap-2'><span className='mt-1.5 size-2.5 shrink-0 rounded-full bg-sky-600' /><div><p className='text-muted-foreground text-[10px] tracking-wide uppercase'>Preferred time</p><p className='text-sm'>{dateTimeValue}</p></div></div></div><form id='details-form' onSubmit={handleSubmit} className='space-y-4'><div className='space-y-2'><Label htmlFor='details-name'>Full Name *</Label><Input id='details-name' placeholder='Your name' className='h-14.5 rounded-[16px] px-4.5 focus-visible:ring-0' required value={name} onChange={event => setName(event.target.value)} /></div><div className='space-y-2'><Label htmlFor='details-email'>Email Address *</Label><Input id='details-email' type='email' placeholder='you@example.com' className='h-14.5 rounded-[16px] px-4.5 focus-visible:ring-0' required value={email} onChange={event => setEmail(event.target.value)} /></div><div className='space-y-2'><Label htmlFor='details-notes'>Message</Label><Textarea id='details-notes' placeholder='Tell me what you would like to discuss...' className='min-h-20 resize-none rounded-[16px] px-4.5 focus-visible:ring-0' value={notes} onChange={event => setNotes(event.target.value)} /></div><input type='hidden' name='sending-state' value={sending ? 'sending' : 'idle'} /></form></div>
}
export default DetailsStep
