import React, { useId } from 'react'

export default function QuantitySelector({ value, onChange, max, label = 'Cantidad', compact = false, disabled = false }) {
  const labelId = useId()
  const safeMax = Math.max(1, Number(max) || 1)

  return (
    <div className="inline-flex flex-col gap-2" aria-labelledby={labelId}>
      {label && <span id={labelId} className="text-sm font-semibold text-[#4b3740]">{label}</span>}
      <div className="inline-flex items-center rounded-full border border-[#34222a]/15 bg-white p-1 shadow-sm">
        <button
          type="button"
          aria-label="Disminuir cantidad"
          onClick={() => onChange(Math.max(1, value - 1))}
          disabled={disabled || value <= 1}
          className={`${compact ? 'h-9 w-9' : 'h-10 w-10'} grid place-items-center rounded-full text-lg text-[#4a2836] transition hover:bg-[#f7edf1] active:scale-95 disabled:cursor-not-allowed disabled:opacity-35`}
        >
          <span aria-hidden="true">−</span>
        </button>
        <output aria-live="polite" className={`${compact ? 'min-w-9' : 'min-w-11'} text-center text-sm font-bold tabular-nums text-[#21151a]`}>
          {value}
        </output>
        <button
          type="button"
          aria-label="Aumentar cantidad"
          onClick={() => onChange(Math.min(safeMax, value + 1))}
          disabled={disabled || value >= safeMax}
          className={`${compact ? 'h-9 w-9' : 'h-10 w-10'} grid place-items-center rounded-full text-lg text-[#4a2836] transition hover:bg-[#f7edf1] active:scale-95 disabled:cursor-not-allowed disabled:opacity-35`}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
    </div>
  )
}
