'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, Building2, Users, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { GlassCard } from '@/components/ui/GlassCard'
import { Avatar } from '@/components/ui/Avatar'
import { PeopleDrawer, type FullBusiness, type PersonWithBusinesses } from '@/components/people/PeopleDrawer'
import { PersonFormModal } from '@/components/people/PersonFormModal'

export type PersonWithExtras = PersonWithBusinesses & { leadCount: number }

type SortKey = 'name' | 'created_at'
type SortDir = 'asc' | 'desc'

interface PeopleAdminClientProps {
  people: PersonWithExtras[]
  isAdmin: boolean
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown size={11} className="opacity-30" />
  return dir === 'asc' ? <ChevronUp size={11} className="text-purple-400" /> : <ChevronDown size={11} className="text-purple-400" />
}

export function PeopleAdminClient({ people: initialPeople, isAdmin }: PeopleAdminClientProps) {
  const [people, setPeople] = useState(initialPeople)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [selectedPerson, setSelectedPerson] = useState<PersonWithExtras | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const list = people.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    )
    return [...list].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  }, [people, search, sortKey, sortDir])

  const handleCreate = (newPerson: any) => {
    setPeople(prev => [{ ...newPerson, leadCount: 0, businesses: [] }, ...prev])
    setShowAddModal(false)
  }

  const handleUpdate = (updated: PersonWithBusinesses) => {
    setPeople(prev => prev.map(p =>
      p.id === updated.id ? { ...updated, leadCount: p.leadCount } : p
    ))
    setSelectedPerson(prev => prev?.id === updated.id ? { ...updated, leadCount: prev.leadCount } : prev)
  }

  const handleDelete = (id: string) => {
    setPeople(prev => prev.filter(p => p.id !== id))
    setSelectedPerson(null)
  }

  const ColHeader = ({ field, label }: { field: SortKey; label: string }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1.5 hover:text-white transition-colors text-left"
    >
      {label}
      <SortIcon active={sortKey === field} dir={sortDir} />
    </button>
  )

  return (
    <div>
      <PageHeader
        title="People"
        subtitle={`${filtered.length} of ${people.length} contacts`}
        actions={
          <Button variant="primary" size="sm" icon={<Plus size={15} />} onClick={() => setShowAddModal(true)}>
            New Person
          </Button>
        }
      />

      <GlassCard animate={false} className="mb-4 p-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, or email..."
            className="w-full h-9 pl-9 pr-4 rounded-xl text-sm bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 transition-all"
          />
        </div>
      </GlassCard>

      <GlassCard animate={false} className="overflow-hidden p-0">
        {/* Table header */}
        <div
          className="grid text-[10px] font-semibold uppercase tracking-wider px-5 py-3 border-b border-white/[0.08]"
          style={{ color: 'var(--text-muted)', gridTemplateColumns: '1.4fr 140px 220px 110px 80px 90px' }}
        >
          <ColHeader field="name" label="Name" />
          <span>Phone</span>
          <span>Email</span>
          <span className="flex items-center gap-1"><Building2 size={11} /> Businesses</span>
          <span className="flex items-center gap-1"><Users size={11} /> Leads</span>
          <ColHeader field="created_at" label="Added" />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-sm text-[var(--text-muted)]">
            {search ? (
              <>No results for &ldquo;{search}&rdquo;</>
            ) : (
              <>No contacts yet.{' '}
                <button className="text-purple-400 hover:underline" onClick={() => setShowAddModal(true)}>
                  Add the first →
                </button>
              </>
            )}
          </div>
        ) : (
          filtered.map((person, i) => (
            <motion.div
              key={person.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i * 0.015, 0.3) }}
              onClick={() => setSelectedPerson(person)}
              className="grid items-center px-5 py-3.5 border-b border-white/[0.04] last:border-0 cursor-pointer hover:bg-white/[0.03] transition-colors group"
              style={{ gridTemplateColumns: '1.4fr 140px 220px 110px 80px 90px' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={person.name} size="sm" />
                <span className="text-sm font-medium text-white truncate group-hover:text-purple-300 transition-colors">
                  {person.name}
                </span>
              </div>

              <span className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                {person.phone || '—'}
              </span>

              <span className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                {person.email || '—'}
              </span>

              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {person.businesses?.length ?? 0}
              </span>

              <span className="text-sm" style={{ color: person.leadCount > 0 ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                {person.leadCount}
              </span>

              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {new Date(person.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
              </span>
            </motion.div>
          ))
        )}
      </GlassCard>

      <PersonFormModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreate={handleCreate}
      />

      {selectedPerson && (
        <PeopleDrawer
          person={selectedPerson}
          open={!!selectedPerson}
          onClose={() => setSelectedPerson(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          isAdmin={isAdmin}
        />
      )}
    </div>
  )
}
