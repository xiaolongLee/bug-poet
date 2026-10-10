import React from 'react'

const POETRY_TYPES = ['七言绝句', '五言绝句', '俳句', '宋词（小令）', '现代诗']

interface Props {
  value: string
  onChange: (v: string) => void
}

const PoetryTypeSelector: React.FC<Props> = ({ value, onChange }) => {
  return (
    <div role="radiogroup" aria-label="诗体选择" className="type-selector">
      {POETRY_TYPES.map((type) => (
        <button
          key={type}
          className={`type-btn${value === type ? ' active' : ''}`}
          onClick={() => onChange(type)}
          type="button"
          aria-pressed={value === type}
        >
          {type}
        </button>
      ))}
    </div>
  )
}

export default PoetryTypeSelector
