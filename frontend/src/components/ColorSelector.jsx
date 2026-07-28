import { useId } from 'react'

const colorMap = {
  blanco: '#f8f5ef',
  negro: '#19171a',
  rojo: '#a92c45',
  verde: '#607c66',
  gris: '#929093',
  celeste: '#8ec8dc',
  azul: '#46668c',
  café: '#805d48',
  cafe: '#805d48',
  beich: '#d6c1a7',
  beige: '#d6c1a7',
}

export function getColorSwatch(label) {
  const normalized = String(label || '').toLocaleLowerCase()
  const match = Object.entries(colorMap).find(([name]) => normalized.includes(name))
  return match?.[1] || '#b68a9c'
}

export default function ColorSelector({ options, value, onChange, error }) {
  const errorId = useId()
  if (!options?.length) return null

  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="text-sm font-semibold text-[#4b3740]">Selecciona el color</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === String(option.id)
          const soldOut = Number(option.stock) <= 0
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              disabled={soldOut}
              onClick={() => onChange(String(option.id))}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 ${
                selected
                  ? 'border-[#6d1738] bg-[#f8edf1] text-[#5a1230] ring-2 ring-[#6d1738]/10'
                  : 'border-[#34222a]/15 bg-white text-[#4b3740] hover:border-[#6d1738]/45'
              }`}
            >
              <span
                aria-hidden="true"
                className="h-4 w-4 rounded-full border border-black/15 shadow-inner"
                style={{ backgroundColor: getColorSwatch(option.color) }}
              />
              {option.color}
              {soldOut && <span className="sr-only">, agotado</span>}
            </button>
          )
        })}
      </div>
      {error && <p id={errorId} role="alert" className="mt-2 text-sm font-medium text-[#a52a47]">{error}</p>}
    </fieldset>
  )
}
