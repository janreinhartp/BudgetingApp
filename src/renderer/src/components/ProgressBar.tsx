interface ProgressBarProps {
  percentage: number
}

export default function ProgressBar({ percentage }: ProgressBarProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, percentage))
  const tone = clamped >= 100 ? 'over' : clamped >= 80 ? 'warn' : 'ok'
  return (
    <div className="progress-track">
      <div className={`progress-fill progress-${tone}`} style={{ width: `${clamped}%` }} />
    </div>
  )
}
