import React, { useState, useEffect } from 'react'
import { getHistory, clearHistory, HistoryEntry } from '../utils/localStorage'

const PoetryHistory: React.FC = () => {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null)

  useEffect(() => {
    setHistory(getHistory())
  }, [])

  const handleClear = () => {
    clearHistory()
    setHistory([])
    setSelectedEntry(null)
  }

  return (
    <div className="poetry-history">
      <div className="history-header">
        <h2>我的诗集</h2>
        {history.length > 0 && (
          <button type="button" className="btn-secondary" onClick={handleClear}>
            清空诗集
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="history-empty">诗集尚空，去写下第一首吧</p>
      ) : (
        <ul className="history-list">
          {history.map((entry) => (
            <li
              key={entry.id}
              className="history-item"
              onClick={() => setSelectedEntry(entry)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedEntry(entry)}
            >
              <span className="history-title">{entry.title}</span>
              <span className="history-meta">
                {entry.poetryType} · {entry.label} · {entry.date}
              </span>
            </li>
          ))}
        </ul>
      )}

      {selectedEntry && (
        <div
          className="history-modal-overlay"
          onClick={() => setSelectedEntry(null)}
          role="dialog"
          aria-modal="true"
          aria-label={selectedEntry.title}
        >
          <div
            className="history-modal xuan-paper"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setSelectedEntry(null)}
              aria-label="关闭"
            >
              ✕
            </button>
            <div className="poem-container">
              <div className="poem-title vertical-poem">{selectedEntry.title}</div>
              {selectedEntry.poem.map((line, idx) => (
                <div key={idx} className="poem-line vertical-poem">
                  {line}
                </div>
              ))}
            </div>
            {selectedEntry.isFreeForm && <span className="free-form-badge">自由体</span>}
            <div className="score-section">
              <span className="score-label">{selectedEntry.label}</span>
              <span className="score-value">凄美指数 {selectedEntry.score}</span>
            </div>
            <div className="note-section">
              <span className="note-prefix">诗人自注：</span>
              <span className="note-text">{selectedEntry.note}</span>
            </div>
            <div className="poem-footer">
              <span>{selectedEntry.date}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PoetryHistory
