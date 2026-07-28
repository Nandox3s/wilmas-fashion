import { useId } from 'react'

export default function SizeSelector({ sizes, value, onChange, error }) {
  const labelId = useId()
  const errorId = useId()
  if (!sizes?.length) return null

  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend id={labelId} className="text-sm font-semibold text-[#4b3740]">Selecciona tu talla</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {sizes.map((size) => (
          <button
            key={size}
            type="button"
            aria-pressed={value === size}
            onClick={() => onChange(size)}
            className={`min-h-11 min-w-11 rounded-full border px-3 text-sm font-bold transition active:scale-95 ${
              value === size
                ? 'border-[#6d1738] bg-[#6d1738] text-white shadow-[0_8px_24px_rgba(109,23,56,0.2)]'
                : 'border-[#34222a]/15 bg-white text-[#4b3740] hover:border-[#6d1738]/45 hover:bg-[#fbf5f7]'
            }`}
          >
            {size}
          </button>
        ))}
      </div>
      {error && <p id={errorId} role="alert" className="mt-2 text-sm font-medium text-[#a52a47]">{error}</p>}
    </fieldset>
  )
}
