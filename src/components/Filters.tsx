import type { FilterState, FiltersData } from '../types'
import { ALL_CATEGORIES, CATEGORY_LABELS } from '../types'

interface Props {
  filters: FilterState
  filtersData: FiltersData
  onChange: (f: FilterState) => void
  onExport: () => void
  onRefresh: () => void
  loading: boolean
}

const DAYS_OPTIONS = [
  { label: '7 days',  value: 7  },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
  { label: 'All time', value: 0 },
]

function Select({
  label, value, options, onChange,
}: {
  label: string
  value: string
  options: { label: string; value: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

export default function Filters({ filters, filtersData, onChange, onExport, onRefresh, loading }: Props) {
  function set<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    onChange({ ...filters, [key]: value })
  }

  return (
    <div className="flex flex-wrap items-end gap-3 p-4 bg-gray-900 border border-gray-800 rounded-xl">
      {/* Date range — pill buttons */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-gray-500 uppercase tracking-wider">Period</span>
        <div className="flex gap-1">
          {DAYS_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => set('days', o.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${filters.days === o.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <Select
        label="Project"
        value={filters.project}
        options={[{ label: 'All projects', value: 'all' }, ...filtersData.projects.map(p => ({ label: p, value: p }))]}
        onChange={v => set('project', v)}
      />

      <Select
        label="Model"
        value={filters.model}
        options={[{ label: 'All models', value: 'all' }, ...filtersData.models.map(m => ({ label: m, value: m }))]}
        onChange={v => set('model', v)}
      />

      <Select
        label="Machine"
        value={filters.machine}
        options={[{ label: 'All machines', value: 'all' }, ...filtersData.machines.map(m => ({ label: m, value: m }))]}
        onChange={v => set('machine', v)}
      />

      <Select
        label="Category"
        value={filters.category}
        options={[
          { label: 'All categories', value: 'all' },
          ...ALL_CATEGORIES.map(c => ({ label: CATEGORY_LABELS[c], value: c })),
        ]}
        onChange={v => set('category', v)}
      />

      {filtersData.tickets.length > 0 && (
        <Select
          label="Ticket"
          value={filters.ticket}
          options={[{ label: 'All tickets', value: 'all' }, ...filtersData.tickets.map(t => ({ label: t, value: t }))]}
          onChange={v => set('ticket', v)}
        />
      )}

      <div className="flex gap-2 ml-auto">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 rounded-lg px-3 py-1.5 text-sm transition-colors"
        >
          <span className={loading ? 'animate-spin' : ''}>↻</span> Refresh
        </button>
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg px-3 py-1.5 text-sm transition-colors"
        >
          ↓ CSV
        </button>
      </div>
    </div>
  )
}
