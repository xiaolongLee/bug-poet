import React, { useState } from 'react'
import InputPanel from './components/InputPanel'
import PoemDisplay from './components/PoemDisplay'
import PoetryHistory from './components/PoetryHistory'
import { calcAestheticScore, getScoreLabel } from './utils/aestheticScore'
import { savePoem } from './utils/localStorage'

interface PoemResult {
  title: string
  poem: string[]
  note: string
  isFreeForm?: boolean
  fallback?: boolean
  message?: string
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

const App: React.FC = () => {
  const [poemResult, setPoemResult] = useState<PoemResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [currentView, setCurrentView] = useState<'main' | 'history'>('main')
  const [currentErrorText, setCurrentErrorText] = useState('')

  const handleGenerate = async (errorText: string, poetryType: string) => {
    setLoading(true)
    setErrorMessage('')
    setPoemResult(null)
    setCurrentErrorText(errorText)

    const score = calcAestheticScore(errorText)
    const label = getScoreLabel(score)

    // Frontend timeout is intentionally longer (15s) than the backend's internal
    // 10s LLM timeout so the backend has time to catch its own timeout and return
    // a fallback poem JSON before the fetch is aborted here.
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    try {
      const res = await fetch(API_BASE + '/api/poem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errorText, poetryType }),
        signal: controller.signal,
      })

      const data: PoemResult = await res.json()

      if (data.fallback) {
        setErrorMessage(data.message || '诗人今天罢工了')
        setPoemResult(data)
      } else {
        setPoemResult(data)
        savePoem({
          id: Date.now().toString(),
          title: data.title,
          poem: data.poem,
          note: data.note,
          poetryType,
          score,
          label,
          date: new Date().toLocaleDateString('zh-CN'),
          isFreeForm: data.isFreeForm,
        })
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setErrorMessage('诗人沉默了太久（超时）')
      } else {
        setErrorMessage('诗人今天罢工了')
      }
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">🪲 Bug 诗人</h1>
        <nav className="app-nav">
          <button
            type="button"
            className={`nav-btn${currentView === 'main' ? ' active' : ''}`}
            onClick={() => setCurrentView('main')}
          >
            作诗
          </button>
          <button
            type="button"
            className={`nav-btn${currentView === 'history' ? ' active' : ''}`}
            onClick={() => setCurrentView('history')}
          >
            我的诗集
          </button>
        </nav>
      </header>

      {currentView === 'main' && (
        <main className="main-content">
          <InputPanel onGenerate={handleGenerate} loading={loading} />
          {loading && (
            <div className="loading" role="status" aria-live="polite">
              诗人正在酝酿情绪……
            </div>
          )}
          {errorMessage && (
            <div className="error-msg" role="alert">
              {errorMessage}
            </div>
          )}
          {poemResult && (
            <PoemDisplay
              title={poemResult.title}
              poem={poemResult.poem}
              note={poemResult.note}
              isFreeForm={poemResult.isFreeForm}
              score={calcAestheticScore(currentErrorText)}
              label={getScoreLabel(calcAestheticScore(currentErrorText))}
              errorText={currentErrorText}
              poetryType=""
            />
          )}
        </main>
      )}

      {currentView === 'history' && <PoetryHistory />}
    </div>
  )
}

export default App
