import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

type PasswordInputProps = {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  autoComplete?: string
}

export function PasswordInput({
  id,
  value,
  onChange,
  placeholder = 'Votre mot de passe',
  disabled = false,
  autoComplete = 'current-password',
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        required
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[#dde3ea] py-3 pl-4 pr-11 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-dark-text/40 focus:border-health-green/40 focus:ring-2 focus:ring-health-green/15 disabled:cursor-not-allowed disabled:bg-light-gray/40"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-dark-text/45 transition-colors hover:text-institutional-blue disabled:cursor-not-allowed"
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}
