const MODELS = [
  { name: 'Claude Opus',   model: 'claude-opus-4-6',   input: 15.00, output: 75.00, cacheRead: 1.50, cacheWrite: 18.75 },
  { name: 'Claude Sonnet', model: 'claude-sonnet-4-6', input:  3.00, output: 15.00, cacheRead: 0.30, cacheWrite:  3.75 },
  { name: 'Claude Haiku',  model: 'claude-haiku-4-5',  input:  0.80, output:  4.00, cacheRead: 0.08, cacheWrite:  1.00 },
]

const COLS = ['Model', 'Input /1M', 'Output /1M', 'Cache read /1M', 'Cache write /1M']

export default function PricingReferenceCard() {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
          API pricing reference
        </h3>
        <a
          href="https://www.anthropic.com/pricing"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          anthropic.com/pricing ↗
        </a>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {COLS.map(h => (
                <th key={h} className="text-left text-xs text-gray-500 uppercase tracking-wider pb-2 pr-6 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODELS.map(m => (
              <tr key={m.model} className="border-b border-gray-800/40">
                <td className="py-2 pr-6 text-xs text-gray-300 font-medium whitespace-nowrap">{m.name}</td>
                <td className="py-2 pr-6 text-xs text-gray-400 whitespace-nowrap">${m.input.toFixed(2)}</td>
                <td className="py-2 pr-6 text-xs text-gray-400 whitespace-nowrap">${m.output.toFixed(2)}</td>
                <td className="py-2 pr-6 text-xs text-green-600 whitespace-nowrap">${m.cacheRead.toFixed(2)}</td>
                <td className="py-2 text-xs text-gray-400 whitespace-nowrap">${m.cacheWrite.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-700 mt-3">Cache read is billed at ~10% of input — most of your token volume is cache reads from the system prompt.</p>
    </div>
  )
}
