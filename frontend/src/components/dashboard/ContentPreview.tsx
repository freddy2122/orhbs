import { useState } from 'react'
import { apiDownload } from '../../lib/api-client'

type Preview = {
  titre: string
  resume: string
  contenu: string
  image_url: string | null
  meta: string[]
  keywords?: string[]
  pdf?: { path: string; filename: string } | null
}

export function ContentPreview({ preview, defaultOpen = false }: { preview: Preview; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const [error, setError] = useState<string | null>(null)

  const openPdf = async () => {
    setError(null)
    try {
      await apiDownload(preview.pdf!.path, preview.pdf!.filename)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fichier indisponible.')
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="text-xs font-semibold text-institutional-black hover:underline"
      >
        {open ? 'Masquer' : 'Lire le contenu'}
      </button>
      {open && (
        <article className="mt-3 rounded-lg border border-[#e8ecf0] bg-[#fafbfc] p-4 text-sm">
          {preview.image_url && (
            <img src={preview.image_url} alt="" className="mb-4 aspect-[16/9] w-full max-w-xl rounded-lg object-cover" />
          )}
          <h4 className="text-base font-semibold text-institutional-black">{preview.titre}</h4>
          {preview.meta.length > 0 && <p className="mt-1 text-xs text-dark-text/55">{preview.meta.join(' · ')}</p>}
          {preview.resume ? (
            <p className="mt-3 font-medium leading-relaxed text-dark-text/85">{preview.resume}</p>
          ) : (
            <p className="mt-3 italic text-dark-text/45">Aucun résumé.</p>
          )}
          {preview.contenu ? (
            <div className="mt-3 whitespace-pre-line leading-relaxed text-dark-text/80">{preview.contenu}</div>
          ) : (
            <p className="mt-3 italic text-dark-text/45">Aucun contenu détaillé.</p>
          )}
          {preview.keywords && preview.keywords.length > 0 && (
            <p className="mt-3 text-xs text-dark-text/55">Mots-clés : {preview.keywords.join(', ')}</p>
          )}
          {preview.pdf && (
            <button type="button" onClick={() => void openPdf()} className="mt-3 text-xs font-semibold text-health-green hover:underline">
              Ouvrir le PDF joint
            </button>
          )}
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </article>
      )}
    </div>
  )
}
