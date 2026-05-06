import { AlertTriangle, AlertCircle, CheckCircle, Activity, Users, TrendingUp } from 'lucide-react'

const SEV_CONFIG = {
  high:   { icon: AlertTriangle, color: 'text-danger',  bg: 'bg-danger/10',  border: 'border-danger/20',  label: 'High' },
  medium: { icon: AlertCircle,   color: 'text-amber',   bg: 'bg-amber/10',   border: 'border-amber/20',   label: 'Medium' },
  low:    { icon: CheckCircle,   color: 'text-acid',    bg: 'bg-acid/10',    border: 'border-acid/20',    label: 'Low' },
}

function StatCard({ icon: Icon, label, value, color, bg, border, sub }) {
  return (
    <div className={`stat-card border ${border} group hover:scale-[1.02] transition-all duration-200`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl ${bg} border ${border} flex items-center justify-center`}>
          <Icon size={16} className={color} />
        </div>
        {sub !== undefined && (
          <span className="text-xs font-mono text-muted">{sub}</span>
        )}
      </div>
      <div className={`font-display font-bold text-3xl ${color} mb-0.5`}>{value ?? '—'}</div>
      <div className="text-muted text-xs font-mono tracking-wider uppercase">{label}</div>
      {/* Shimmer effect */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}

export default function StatsPanel({ stats, potholes }) {
  const recentActivity = potholes?.slice(0, 3) || []

  return (
    <div className="flex flex-col gap-4">
      {/* Top row: severity cards */}
      <div className="grid grid-cols-3 gap-3">
        {['high', 'medium', 'low'].map((sev) => {
          const cfg = SEV_CONFIG[sev]
          return (
            <StatCard
              key={sev}
              icon={cfg.icon}
              label={cfg.label}
              value={stats?.[sev] ?? 0}
              color={cfg.color}
              bg={cfg.bg}
              border={cfg.border}
            />
          )
        })}
      </div>

      {/* Total + Users */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Activity}
          label="Total Potholes"
          value={stats?.total ?? 0}
          color="text-neon"
          bg="bg-neon/10"
          border="border-neon/20"
        />
        <StatCard
          icon={Users}
          label="Active Users"
          value={stats?.users ?? 0}
          color="text-neon-glow"
          bg="bg-neon/10"
          border="border-neon/20"
        />
      </div>

      {/* Recent activity feed */}
      <div className="glass rounded-2xl p-4 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-neon" />
          <span className="text-xs font-mono text-soft tracking-wider uppercase">Recent Detections</span>
          <div className="ml-auto w-2 h-2 rounded-full bg-acid animate-pulse" />
        </div>

        <div className="flex flex-col gap-2">
          {recentActivity.length === 0 ? (
            <p className="text-muted text-xs text-center py-4 font-mono">No detections yet</p>
          ) : (
            recentActivity.map((p) => {
              const cfg = SEV_CONFIG[p.severity] || SEV_CONFIG.low
              return (
                <div key={p.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface border ${cfg.border} border-opacity-50`}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    p.severity === 'high' ? 'bg-danger' : p.severity === 'medium' ? 'bg-amber' : 'bg-acid'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-soft truncate">
                      {p.latitude?.toFixed(4)}, {p.longitude?.toFixed(4)}
                    </div>
                    <div className="text-[10px] text-muted truncate">
                      {new Date(p.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono font-bold ${cfg.color} flex-shrink-0`}>
                    {p.severity?.toUpperCase()}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
