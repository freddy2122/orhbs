import { useState } from 'react'
import type { OrgNode } from '../../constants/contentData'

export function OrgChart({ data }: { data: OrgNode }) {
  const [selected, setSelected] = useState<OrgNode | null>(null)

  const renderNode = (node: OrgNode, depth = 0) => (
    <div key={node.id} className={depth > 0 ? 'ml-6 mt-3 border-l-2 border-health-green/20 pl-4' : ''}>
      <button
        type="button"
        onClick={() => setSelected(node)}
        className={`w-full rounded-lg border px-4 py-3 text-left transition-all ${
          selected?.id === node.id
            ? 'border-health-green bg-health-green/10'
            : 'border-[#e8ecf0] bg-white hover:border-health-green/30'
        }`}
      >
        <p className="font-semibold text-institutional-blue">{node.title}</p>
        <p className="text-xs text-dark-text/60">{node.role}</p>
      </button>
      {node.children?.map((child) => renderNode(child, depth + 1))}
    </div>
  )

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>{renderNode(data)}</div>
      <div className="rounded-xl border border-[#e8ecf0] bg-light-gray/30 p-6">
        {selected ? (
          <>
            <h3 className="text-lg font-semibold text-institutional-blue">{selected.title}</h3>
            <p className="mt-1 text-sm text-health-green">{selected.role}</p>
            <ul className="mt-4 space-y-2">
              {selected.missions.map((m) => (
                <li key={m} className="flex gap-2 text-sm text-dark-text/70">
                  <span className="text-health-green">•</span> {m}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-dark-text/50">Cliquez sur un poste pour voir les missions.</p>
        )}
      </div>
    </div>
  )
}
