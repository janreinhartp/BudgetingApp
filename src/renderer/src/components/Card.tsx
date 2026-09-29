interface CardProps {
  label: string
  value: string
  tone?: 'default' | 'positive' | 'negative'
}

export default function Card({ label, value, tone = 'default' }: CardProps): JSX.Element {
  return (
    <div className={`card card-${tone}`}>
      <div className="card-label">{label}</div>
      <div className="card-value">{value}</div>
    </div>
  )
}
