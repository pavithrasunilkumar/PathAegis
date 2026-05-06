import { useState } from 'react'
import { List, ChevronUp, ChevronDown, Filter } from 'lucide-react'

const SEVERITY_BADGE = {
  high:   <span className="severity-badge-high">● HIGH</span>,
  medium: <span className="severity-badge-medium">● MED</span>,
  low:    <span className="severity-badge-low">● LOW</span>,
}

export default function PotholeTable({ potholes = [] }) {
  const [filter, setFilter] = useState('all')
  const [sortDir, setSortDir] = useState('desc')

  const filtered = potholes
    .filter(p => filter === 'all' || p.severity === filter)
    .sort((a, b) => {
      const ta = new Date(a.timestamp).getTime()
      const tb = new Date(b.timestamp).getTime()
      return sortDir === 'desc' ? tb - ta : ta - tb
    })
    .slice(0, 50)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <List size={15} className="text-neon" />
          <span className="text-xs font-mono text-soft tracking-wider uppercase">Detection Log</span>
          <span className="text-[10px] font-mono text-muted bg-surface px-2 py-0.5 rounded-full border border-border">
            {filtered.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter */}
          <div className="flex items-center gap-1">
            {['all', 'high', 'medium', 'low'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[10px] font-mono px-2 py-1 rounded-lg transition-all ${
                  filter === f
                    ? 'bg-neon/20 text-neon border border-neon/30'
                    : 'text-muted hover:text-soft border border-transparent'
                }`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          {/* Sort */}
          <button
            onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1 text-[10px] font-mono text-muted hover:text-soft px-2 py-1 rounded-lg border border-transparent hover:border-border transition-all"
          >
            {sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            TIME
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-panel border-b border-border z-10">
            <tr>
              <th className="text-left px-3 py-2.5 text-muted font-mono text-[10px] tracking-wider uppercase">Severity</th>
              <th className="text-left px-3 py-2.5 text-muted font-mono text-[10px] tracking-wider uppercase hidden sm:table-cell">Location</th>
              <th className="text-left px-3 py-2.5 text-muted font-mono text-[10px] tracking-wider uppercase hidden md:table-cell">Confidence</th>
              <th className="text-left px-3 py-2.5 text-muted font-mono text-[10px] tracking-wider uppercase">Time</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-muted text-xs font-mono">
                  No potholes detected yet.<br />
                  <span className="text-[10px]">Start the ML detector to begin.</span>
                </td>
              </tr>
            ) : (
              filtered.map((p, i) => (
                <tr
                  key={p.id}
                  className={`border-b border-border/50 hover:bg-surface/50 transition-colors ${i % 2 === 0 ? '' : 'bg-surface/20'}`}
                >
                  <td className="px-3 py-2.5">
                    {SEVERITY_BADGE[p.severity] || SEVERITY_BADGE.low}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-muted hidden sm:table-cell">
                    {p.latitude?.toFixed(4)}, {p.longitude?.toFixed(4)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-muted hidden md:table-cell">
                    {p.confidence ? `${(p.confidence * 100).toFixed(0)}%` : '—'}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-muted text-[10px]">
                    {new Date(p.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
