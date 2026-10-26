import { useState } from 'react'
import {
  STATUT_STYLES,
  type EditorialAvailableAction,
  type WorkflowAction,
  type WorkflowFields,
} from '../../lib/editorial-workflow'

type Props = {
  item: WorkflowFields
  busy?: boolean
  onAction: (action: WorkflowAction, motif?: string) => void
  onDelete?: () => void
}

const BTN = 'text-xs font-medium hover:underline disabled:opacity-50'

export function WorkflowBadge({ item }: { item: WorkflowFields }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUT_STYLES[item.statut]}`}>
      {item.statut_label}
    </span>
  )
}

export function WorkflowTrail({ item }: { item: WorkflowFields }) {
  const parts: string[] = []
  if (item.cree_par_nom) parts.push(`Rédigé par ${item.cree_par_nom}`)
  if (item.soumis_par_nom && item.statut !== 'brouillon') parts.push(`soumis par ${item.soumis_par_nom}`)
  if (item.valide_par_nom && item.statut === 'publie') parts.push(`publié par ${item.valide_par_nom}`)
  return (
    <>
      {parts.length > 0 && <p className="text-[11px] text-dark-text/50">{parts.join(' · ')}</p>}
      {item.statut === 'rejete' && item.motif_rejet && (
        <p className="mt-1 rounded bg-red-50 px-2 py-1 text-xs text-red-700">Motif du rejet : {item.motif_rejet}</p>
      )}
    </>
  )
}

export function WorkflowControls({ item, busy, onAction, onDelete }: Props) {
  const [rejecting, setRejecting] = useState(false)
  const [motif, setMotif] = useState('')
  const can = (action: EditorialAvailableAction) => item.actions_disponibles.includes(action)

  if (rejecting) {
    return (
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          onAction('reject', motif)
          setRejecting(false)
          setMotif('')
        }}
      >
        <input
          required
          autoFocus
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          placeholder="Motif du rejet"
          className="w-48 rounded border border-[#dde3ea] px-2 py-1 text-xs"
        />
        <button type="submit" disabled={busy} className={`${BTN} text-red-600`}>Confirmer</button>
        <button type="button" onClick={() => setRejecting(false)} className={`${BTN} text-dark-text/60`}>Annuler</button>
      </form>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {can('submit') && (
        <button type="button" disabled={busy} onClick={() => onAction('submit')} className={`${BTN} text-health-green`}>
          {item.statut === 'rejete' ? 'Resoumettre' : 'Soumettre à relecture'}
        </button>
      )}
      {can('publish') && (
        <button type="button" disabled={busy} onClick={() => onAction('publish')} className={`${BTN} text-health-green`}>
          Publier
        </button>
      )}
      {item.statut === 'en_relecture' && !can('publish') && can('reject') && (
        <span className="text-[11px] text-dark-text/50">Un autre relecteur doit publier</span>
      )}
      {can('reject') && (
        <button type="button" disabled={busy} onClick={() => setRejecting(true)} className={`${BTN} text-red-600`}>
          Rejeter
        </button>
      )}
      {can('unpublish') && (
        <button type="button" disabled={busy} onClick={() => onAction('unpublish')} className={`${BTN} text-institutional-black`}>
          Dépublier
        </button>
      )}
      {can('delete') && onDelete && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (window.confirm('Supprimer définitivement ce contenu ?')) onDelete()
          }}
          className={`${BTN} text-red-600`}
        >
          Supprimer
        </button>
      )}
    </div>
  )
}
