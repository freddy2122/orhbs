type FlagBarProps = {
  className?: string
}

export function FlagBar({ className = '' }: FlagBarProps) {
  return (
    <div
      className={`flex h-1 w-full overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <span className="flex-1 bg-[#008751]" />
      <span className="flex-1 bg-[#FCD116]" />
      <span className="flex-1 bg-[#E8112D]" />
    </div>
  )
}
