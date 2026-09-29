import type { ReactNode } from 'react'

interface FieldProps {
  label: string
  children: ReactNode
}

/** Labeled form field wrapper so every input has a visible title, not just a placeholder. */
export default function Field({ label, children }: FieldProps): JSX.Element {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  )
}
