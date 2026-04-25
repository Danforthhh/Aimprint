interface Props {
  agentCalls: number
  sessionsWithAgents: number
}

export default function AgentCallsCard({ agentCalls, sessionsWithAgents }: Props) {
  return (
    <div className="card flex flex-col justify-between">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Sub-agent calls</h3>
      <div>
        <p className="text-4xl font-bold text-white">{agentCalls.toLocaleString()}</p>
        <p className="text-xs text-gray-500 mt-1">
          {sessionsWithAgents === 0
            ? 'No sub-agents used in this period'
            : `across ${sessionsWithAgents} session${sessionsWithAgents !== 1 ? 's' : ''}`}
        </p>
      </div>
      <p className="text-xs text-gray-600">Agent tool calls from session logs</p>
    </div>
  )
}
