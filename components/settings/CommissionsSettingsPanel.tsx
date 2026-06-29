'use client'

import { useState, useEffect } from 'react'
import { Save, Edit3, CheckCircle, Percent } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase'
import type { PaymentProcessor, MonthlyProcessorPayment } from '@/types'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const fmt$ = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function CommissionsSettingsPanel() {
  const supabase = createClient()
  const [innerTab, setInnerTab] = useState<'payments' | 'rates'>('payments')
  const [processors, setProcessors] = useState<PaymentProcessor[]>([])
  const [payments, setPayments] = useState<MonthlyProcessorPayment[]>([])
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [paymentForm, setPaymentForm] = useState({ processor: '', total_amount_paid: '', date_received: '', notes: '' })
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)
  const [savingPayment, setSavingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [editingRates, setEditingRates] = useState<Record<string, string>>({})
  const [savingRate, setSavingRate] = useState<string | null>(null)
  const [rateSavedId, setRateSavedId] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: procs } = await supabase.from('payment_processors').select('*').order('name')
      const proc = (procs ?? []) as PaymentProcessor[]
      setProcessors(proc)
      const rates: Record<string, string> = {}
      proc.forEach(p => { rates[p.id] = p.commission_pct.toString() })
      setEditingRates(rates)
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    async function loadPayments() {
      const { data } = await supabase
        .from('monthly_processor_payments')
        .select('*')
        .eq('year', selectedYear)
        .eq('month', selectedMonth)
        .order('created_at', { ascending: false })
      setPayments((data ?? []) as MonthlyProcessorPayment[])
    }
    loadPayments()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMonth])

  const handleSavePayment = async () => {
    if (!paymentForm.processor) { setPaymentError('Select a processor'); return }
    const amount = parseFloat(paymentForm.total_amount_paid)
    if (isNaN(amount) || amount <= 0) { setPaymentError('Enter a valid amount'); return }
    setSavingPayment(true)
    setPaymentError('')
    try {
      if (editingPaymentId) {
        await supabase.from('monthly_processor_payments')
          .update({
            total_amount_paid: amount,
            date_received: paymentForm.date_received || null,
            notes: paymentForm.notes || null,
          })
          .eq('id', editingPaymentId)
      } else {
        await supabase.from('monthly_processor_payments')
          .upsert({
            processor: paymentForm.processor,
            year: selectedYear,
            month: selectedMonth,
            total_amount_paid: amount,
            date_received: paymentForm.date_received || null,
            notes: paymentForm.notes || null,
          }, { onConflict: 'processor,year,month' })
      }
      const { data } = await supabase
        .from('monthly_processor_payments')
        .select('*')
        .eq('year', selectedYear)
        .eq('month', selectedMonth)
        .order('created_at', { ascending: false })
      setPayments((data ?? []) as MonthlyProcessorPayment[])
      setPaymentForm({ processor: '', total_amount_paid: '', date_received: '', notes: '' })
      setEditingPaymentId(null)
      setPaymentSuccess(true)
      setTimeout(() => setPaymentSuccess(false), 2000)
    } catch {
      setPaymentError('Failed to save payment')
    } finally {
      setSavingPayment(false)
    }
  }

  const startEditPayment = (payment: MonthlyProcessorPayment) => {
    setEditingPaymentId(payment.id)
    setPaymentForm({
      processor: payment.processor,
      total_amount_paid: payment.total_amount_paid.toString(),
      date_received: payment.date_received ?? '',
      notes: payment.notes ?? '',
    })
  }

  const handleSaveRate = async (processorId: string) => {
    const val = parseFloat(editingRates[processorId] ?? '')
    if (isNaN(val) || val < 0 || val > 100) return
    setSavingRate(processorId)
    try {
      await supabase.from('payment_processors')
        .update({ commission_pct: val })
        .eq('id', processorId)
      setRateSavedId(processorId)
      setTimeout(() => setRateSavedId(null), 2000)
    } catch {
      // silent
    } finally {
      setSavingRate(null)
    }
  }

  const monthTotal = payments.reduce((s, p) => s + (p.total_amount_paid ?? 0), 0)
  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1

  if (loading) return (
    <div className="py-12 text-center text-xs" style={{ color: 'var(--text-muted)' }}>Loading…</div>
  )

  return (
    <div className="space-y-5">
      {/* Inner tab bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
        {(['payments', 'rates'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setInnerTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              innerTab === tab ? 'bg-white/[0.08] text-white' : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            {tab === 'payments' ? 'Processor Payments' : 'Commission Rates'}
          </button>
        ))}
      </div>

      {/* Processor Payments tab */}
      {innerTab === 'payments' && (
        <GlassCard animate={false}>
          {/* Month / year selectors */}
          <div className="flex items-center gap-3 mb-5">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(parseInt(e.target.value))}
              style={{ background: '#1a1f2e', color: '#e2e8f8', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '7px 12px', fontSize: '13px', cursor: 'pointer' }}
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
              style={{ background: '#1a1f2e', color: '#e2e8f8', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '7px 12px', fontSize: '13px', cursor: 'pointer' }}
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            {isCurrentMonth && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Current Month
              </span>
            )}
          </div>

          {/* Payment rows */}
          {payments.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
              No payments recorded for {MONTHS[selectedMonth - 1]} {selectedYear}
            </div>
          ) : (
            <div className="space-y-1 mb-4">
              {payments.map(p => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] group"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-white">{p.processor}</span>
                    {p.date_received && (
                      <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        · Received {new Date(p.date_received).toLocaleDateString()}
                      </span>
                    )}
                    {p.notes && (
                      <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>{p.notes}</span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-white">{fmt$(p.total_amount_paid)}</span>
                  <button
                    onClick={() => startEditPayment(p)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-white/[0.06]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Edit3 size={13} />
                  </button>
                </div>
              ))}
              {/* Totals row */}
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 mt-2">
                <span className="flex-1 text-sm font-semibold text-purple-300">Total Received</span>
                <span className="text-sm font-bold text-purple-300">{fmt$(monthTotal)}</span>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-white/[0.06] my-5" />

          {/* Record / Edit form */}
          <h3 className="text-sm font-semibold text-white mb-4">
            {editingPaymentId ? 'Edit Payment' : 'Record Payment'}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Processor
              </label>
              <select
                value={paymentForm.processor}
                onChange={e => setPaymentForm(f => ({ ...f, processor: e.target.value }))}
                disabled={!!editingPaymentId}
                style={{
                  background: '#1a1f2e',
                  color: '#e2e8f8',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  width: '100%',
                  cursor: editingPaymentId ? 'default' : 'pointer',
                  opacity: editingPaymentId ? 0.6 : 1,
                }}
              >
                <option value="">Select processor…</option>
                {processors.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Amount ($)"
                type="number"
                step="0.01"
                value={paymentForm.total_amount_paid}
                onChange={e => setPaymentForm(f => ({ ...f, total_amount_paid: e.target.value }))}
                placeholder="0.00"
              />
              <Input
                label="Date Received"
                type="date"
                value={paymentForm.date_received}
                onChange={e => setPaymentForm(f => ({ ...f, date_received: e.target.value }))}
              />
            </div>
            <Input
              label="Notes (optional)"
              value={paymentForm.notes}
              onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
            />

            {paymentError && (
              <p className="text-xs text-red-400">{paymentError}</p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="primary"
                size="sm"
                icon={paymentSuccess ? <CheckCircle size={13} /> : <Save size={13} />}
                loading={savingPayment}
                onClick={handleSavePayment}
              >
                {paymentSuccess ? 'Saved!' : editingPaymentId ? 'Update Payment' : 'Record Payment'}
              </Button>
              {editingPaymentId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingPaymentId(null)
                    setPaymentForm({ processor: '', total_amount_paid: '', date_received: '', notes: '' })
                    setPaymentError('')
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Commission Rates tab */}
      {innerTab === 'rates' && (
        <GlassCard animate={false}>
          <div className="mb-5">
            <h3 className="font-semibold text-white">Commission Rates</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Set the default company commission % from each processor's residuals.
            </p>
          </div>
          <div className="space-y-2">
            {processors.map(proc => (
              <div
                key={proc.id}
                className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{proc.name}</span>
                    {!proc.active && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-[var(--text-muted)]">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Deposits around day {proc.deposit_day}
                  </p>
                </div>
                <div className="relative w-24">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={editingRates[proc.id] ?? ''}
                    onChange={e => setEditingRates(r => ({ ...r, [proc.id]: e.target.value }))}
                    className="w-full h-9 pl-3 pr-7 rounded-xl text-sm text-right"
                    style={{ background: '#1a1f2e', color: '#e2e8f8', border: '1px solid rgba(255,255,255,0.15)' }}
                  />
                  <Percent size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                </div>
                <button
                  onClick={() => handleSaveRate(proc.id)}
                  disabled={savingRate === proc.id}
                  className="p-2 rounded-lg transition-all hover:bg-white/[0.06]"
                  style={{ color: rateSavedId === proc.id ? '#4ade80' : 'var(--text-muted)' }}
                  title="Save rate"
                >
                  {rateSavedId === proc.id ? <CheckCircle size={15} /> : <Save size={15} />}
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs mt-5" style={{ color: 'var(--text-muted)' }}>
            These are company-wide defaults. Individual deal rates can be overridden per lead.
          </p>
        </GlassCard>
      )}
    </div>
  )
}
