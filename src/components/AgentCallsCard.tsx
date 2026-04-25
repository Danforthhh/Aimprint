import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  agentCalls: number
  sessionsWithAgents: number
  dailyData: { date: string; agent_calls: number }[]
}

export default function AgentCallsCard({ agentCalls, sessionsWithAgents, dailyData }: Props) {
  return (
    <div className="card">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Sub-agent calls</h3>
        <span className="text-xs text-gray-500">
          {sessionsWithAgents === 0 ? 'no sessions' : `${sessionsWithAgents} session${sessionsWithAgents !== 1 ? 's' : ''}`}
        </span>
      </div>
      <p className="text-3xl font-bold text-white mb-4">{agentCalls.toLocaleString()}</p>
      {dailyData.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-sm text-gray-600">No sub-agent calls in this period</div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={dailyData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickFormatter={d => d.slice(5)}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={24}
            />
            <Tooltip
              formatter={(v: number) => [v, 'Agent calls']}
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#e5e7eb' }}
              itemStyle={{ color: '#9ca3af' }}
            />
            <Bar dataKey="agent_calls" fill="#a855f7" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
