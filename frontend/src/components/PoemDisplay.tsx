import React, { useRef } from 'react'
import html2canvas from 'html2canvas'
import { parseBugLocation } from '../utils/bugParser'

interface Props {
  title: string
  poem: string[]
  note: string
  score: number
  label: string
  isFreeForm?: boolean
  errorText: string
  poetryType: string
}

const PoemDisplay: React.FC<Props> = ({
  title,
  poem,
  note,
  score,
  label,
  isFreeForm,
  errorText,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { filename, line } = parseBugLocation(errorText)
  const today = new Date().toLocaleDateString('zh-CN')

  const handleExport = () => {
    if (!containerRef.current) return
    html2canvas(containerRef.current, { useCORS: true, scale: 2 }).then((canvas) => {
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `bug-poem-${Date.now()}.png`
      a.click()
    })
  }

  return (
    <div className="poem-display-wrapper">
      <div ref={containerRef} className="xuan-paper poem-display">
        <div className="poem-container">
          <div className="poem-title vertical-poem">{title}</div>
          {poem.map((line_text, idx) => (
            <div key={idx} className="poem-line vertical-poem">
              {line_text}
            </div>
          ))}
        </div>

        {isFreeForm && <span className="free-form-badge">自由体</span>}

        <div className="score-section">
          <span className="score-label">{label}</span>
          <span className="score-value">凄美指数 {score}</span>
          <div className="score-bar" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
            <div className="score-bar-fill" style={{ width: `${score}%` }} />
          </div>
        </div>

        <div className="note-section">
          <span className="note-prefix">诗人自注：</span>
          <span className="note-text">{note}</span>
        </div>

        <div className="poem-footer">
          <span>{today}</span>
          {filename && (
            <span className="location">
              {filename}
              {line !== null ? `:${line}` : ''}
            </span>
          )}
        </div>
      </div>

      <button type="button" className="btn-export" onClick={handleExport}>
        导出卡片
      </button>
    </div>
  )
}

export default PoemDisplay
