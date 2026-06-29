'use client'

import { use, useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Calendar, CheckCircle } from 'lucide-react'
import { AmbientBackground } from '@/components/ui/AmbientBackground'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const AVAILABLE_SLOTS = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '1:00 PM', '1:30 PM', '2:00 PM',
  '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM',
]

export default function BookingPage({ params }: { params: Promise<{ rep: string }> }) {
  const { rep } = use(params)
  const repName = rep.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const [step, setStep] = useState<'time' | 'info' | 'confirm'>('time')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    business_name: '',
  })

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repSlug:      rep,
          date:         selectedDate,
          time:         selectedTime,
          name:         form.name,
          email:        form.email,
          phone:        form.phone,
          businessName: form.business_name,
        }),
      })
      const json = await res.json()
      if (!json.success) console.error('[book]', json.error)
    } catch (err) {
      console.error('[book]', err)
    } finally {
      setLoading(false)
      setStep('confirm')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#080b12' }}>
      <AmbientBackground />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-lg"
      >
        <div className="glass-strong rounded-2xl overflow-hidden">
          {/* Header */}
          <div
            className="p-6 text-center"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(37,99,235,0.1))' }}
          >
            <div
              className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
            >
              <Zap size={24} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Book a Meeting</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              with {repName} · Breakthrough Business Advisors
            </p>
          </div>

          <div className="p-6">
            {step === 'confirm' ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <CheckCircle size={56} className="mx-auto mb-4 text-emerald-400" />
                <h2 className="text-xl font-bold text-white mb-2">You&apos;re booked!</h2>
                <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                  {selectedDate} at {selectedTime}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  A confirmation email has been sent to {form.email}
                </p>
                <div className="mt-4 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-left">
                  <div className="text-white font-medium mb-1">Meeting Details</div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    <div>{form.name} · {form.business_name}</div>
                    <div>{selectedDate} at {selectedTime}</div>
                    <div>with {repName}</div>
                  </div>
                </div>
              </motion.div>
            ) : step === 'time' ? (
              <div>
                <h2 className="text-sm font-semibold text-white mb-4">Select a Date & Time</h2>
                <Input
                  label="Date"
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="mb-4"
                  min={new Date().toISOString().split('T')[0]}
                />
                {selectedDate && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                      Available Times
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {AVAILABLE_SLOTS.map(slot => (
                        <button
                          key={slot}
                          onClick={() => setSelectedTime(slot)}
                          className={`py-2 rounded-xl text-sm transition-all ${
                            selectedTime === slot
                              ? 'bg-purple-600 text-white'
                              : 'glass glass-hover text-[var(--text-secondary)] hover:text-white'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                    {selectedTime && (
                      <Button
                        variant="primary"
                        className="w-full mt-4"
                        onClick={() => setStep('info')}
                      >
                        Continue →
                      </Button>
                    )}
                  </motion.div>
                )}
              </div>
            ) : (
              <form onSubmit={handleBook} className="space-y-4">
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-2 text-sm text-purple-300">
                  <Calendar size={14} />
                  {selectedDate} · {selectedTime}
                  <button type="button" onClick={() => setStep('time')} className="ml-auto text-xs hover:underline">Change</button>
                </div>
                <h2 className="text-sm font-semibold text-white">Your Information</h2>
                <Input
                  label="Your Name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="Jane Smith"
                />
                <Input
                  label="Business Name"
                  value={form.business_name}
                  onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
                  required
                  placeholder="Smith&apos;s Restaurant"
                />
                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  placeholder="jane@smithsrestaurant.com"
                />
                <Input
                  label="Phone"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  required
                  placeholder="(555) 000-0000"
                />
                <Button type="submit" variant="primary" className="w-full" loading={loading} size="lg">
                  Confirm Booking
                </Button>
              </form>
            )}
          </div>
        </div>
        <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          Breakthrough Business Advisors · Merchant Services
        </p>
      </motion.div>
    </div>
  )
}
