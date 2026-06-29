'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DollarSign, ChevronDown, ChevronUp, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/layout/PageHeader'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const fmt$ = (n: number) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

type LineItem = {
  id: string
  processor: string
  amount_from_processor: number
  commission_rate: number
  commission_amount: number
  notes?: string | null
  business?: { business_name: string } | null
  lead?: { business_name: string } | null
}

type CommissionRecord = {
  id: string
  year: number
  month: number
  status: 'pending' | 'partial' | 'paid'
  total_owed: number
  total_paid: number
  paid_date?: string | null
  line_items: LineItem[]
}

interface MyCommissionsClientProps {
  records: CommissionRecord[]
}

export function MyCommissionsClient({ records }: MyCommissionsClientProps) {
  const [expanded, setExpanded] = useState<string | null>(records[0]?.id ?? null)
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all')

  const filtered = records.filter(r => {
    if (filter === 'paid') return r.status === 'paid'
    if (filter === 'pending') return r.status !== 'paid'
    return true
  })

  const totalEarned = records.reduce((s, r) => s + Number(r.total_owed), 0)
  const totalPaid = records.reduce((s, r) => s + Number(r.total_paid), 0)
  const pendingCount = records.filter(r => r.status !== 'paid').length

  return (
    <div>
      <PageHeader title="My Commissions" subtitle="Your commission payment history" />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <GlassCard animate={false} className="py-4">
          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Total Earned</p>
          <p className="text-xl font-bold text-white">{fmt$(totalEarned)}</p>
        </GlassCard>
        <GlassCard animate={false} className="py-4">
          <p className="text-xs mb-1 text-green-400">Total Paid</p>
          <p className="text-xl font-bold text-green-400">{fmt$(totalPaid)}</p>
        </GlassCard>
        <GlassCard animate={false} className="py-4">
          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Pending</p>
          <p className="text-xl font-bold text-white">{fmt$(totalEarned - totalPaid)}</p>
          {pendingCount > 0 && (
            <p className="text-xs mt-0.5 text-amber-400">{pendingCount} statement{pendingCount !== 1 ? 's' : ''}</p>
          )}
        </GlassCard>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-5 w-fit" style={{ background: 'rgba(255,255,255,0.05)' }}>
        {(['all', 'paid', 'pending'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize"
            style={filter === tab
              ? { background: 'rgba(124,58,237,0.3)', color: 'white' }
              : { color: 'var(--text-secondary)' }
            }
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Records */}
      {filtered.length === 0 ? (
        <GlassCard animate={false} className="text-center py-12">
          <DollarSign size={32} className="mx-auto mb-3 opacity-20 text-white" />
          <p style={{ color: 'var(--text-secondary)' }}>No statements yet.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((record, i) => {
            const isOpen = expanded === record.id
            const outstanding = Number(record.total_owed) - Number(record.total_paid)

            return (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <GlassCard animate={false} className={record.status === 'paid' ? 'border-green-500/15' : ''}>
                  {/* Header row */}
                  <button
                    className="w-full flex items-center justify-between gap-4"
                    onClick={() => setExpanded(isOpen ? null : record.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        record.status === 'paid' ? 'bg-green-500/15' : 'bg-purple-500/15'
                      }`}>
                        {record.status === 'paid'
                          ? <CheckCircle size={16} className="text-green-400" />
                          : <Clock size={16} className="text-purple-400" />
                        }
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-white text-sm">
                          {MONTH_NAMES[record.month - 1]} {record.year}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {record.line_items.length} deal{record.line_items.length !== 1 ? 's' : ''}
                          {record.paid_date && (
                            <> · Paid {new Date(record.paid_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-white text-sm">{fmt$(record.total_owed)}</p>
                        {record.status !== 'paid' && outstanding > 0 && (
                          <p className="text-xs text-amber-400">{fmt$(outstanding)} pending</p>
                        )}
                      </div>
                      <Badge variant={record.status === 'paid' ? 'green' : record.status === 'partial' ? 'amber' : 'gray'}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </Badge>
                      {isOpen ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                    </div>
                  </button>

                  {/* Expanded line items */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t border-white/[0.06]">
                          {record.line_items.length === 0 ? (
                            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No line items recorded</p>
                          ) : (
                            <table className="w-full text-sm">
                              <thead>
                                <tr style={{ color: 'var(--text-secondary)' }}>
                                  <th className="text-left pb-3 font-medium text-xs uppercase tracking-wide">Business</th>
                                  <th className="text-left pb-3 font-medium text-xs uppercase tracking-wide">Processor</th>
                                  <th className="text-right pb-3 font-medium text-xs uppercase tracking-wide">Received</th>
                                  <th className="text-center pb-3 font-medium text-xs uppercase tracking-wide">Rate</th>
                                  <th className="text-right pb-3 font-medium text-xs uppercase tracking-wide text-purple-400">Commission</th>
                                </tr>
                              </thead>
                              <tbody>
                                {record.line_items.map(item => (
                                  <tr key={item.id} className="border-t border-white/[0.04]">
                                    <td className="py-2.5 text-white pr-4">
                                      {item.business?.business_name || item.lead?.business_name || '—'}
                                    </td>
                                    <td className="py-2.5 pr-4" style={{ color: 'var(--text-secondary)' }}>{item.processor}</td>
                                    <td className="py-2.5 text-right pr-4 text-white">{fmt$(item.amount_from_processor)}</td>
                                    <td className="py-2.5 text-center pr-4" style={{ color: 'var(--text-secondary)' }}>{item.commission_rate}%</td>
                                    <td className="py-2.5 text-right font-semibold text-purple-400">{fmt$(item.commission_amount)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t border-white/[0.08]">
                                  <td colSpan={4} className="pt-3 font-semibold text-white">Total</td>
                                  <td className="pt-3 text-right font-bold text-white">{fmt$(record.total_owed)}</td>
                                </tr>
                                {Number(record.total_paid) > 0 && (
                                  <tr>
                                    <td colSpan={4} className="pt-1 text-xs text-green-400">Paid</td>
                                    <td className="pt-1 text-right text-xs text-green-400">{fmt$(record.total_paid)}</td>
                                  </tr>
                                )}
                              </tfoot>
                            </table>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </GlassCard>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
