import { useState } from 'react'

type TickProps = {
  id: string
  name: string
  label: string
  checked?: boolean
  onChange?: (checked: boolean) => void
  className?: string
}

export default function Tick({
  id,
  name,
  label,
  checked = false,
  onChange,
  className = ''
}: TickProps) {
  const [isChecked, setIsChecked] = useState(checked)

  const toggle = () => {
    const newState = !isChecked
    setIsChecked(newState)
    onChange?.(newState)
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div
        role="checkbox"
        aria-checked={isChecked}
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => e.key === ' ' && toggle()}
        className="relative h-4 w-4 cursor-pointer border border-text-primary transition-colors hover:border-accent-green"
      >
        {isChecked && (
          <div className="absolute inset-0.5 bg-text-primary transition-colors" />
        )}
      </div>

      <span
        onClick={toggle}
        className="cursor-pointer select-none text-sm lowercase text-text-primary"
      >
        {label}
      </span>
      
      <input
        type="checkbox"
        id={id}
        name={name}
        checked={isChecked}
        onChange={toggle}
        className="sr-only"
      />
    </div>
  )
} 