import React, { useState } from 'react'
import PoetryTypeSelector from './PoetryTypeSelector'

const EXAMPLES = [
  `Exception in thread "main" java.lang.NullPointerException
    at com.example.App.processUser(App.java:42)
    at com.example.App.main(App.java:15)`,
  `Traceback (most recent call last):
  File "app.py", line 87, in get_user
    response = requests.get(url, timeout=5)
requests.exceptions.HTTPError: 404 Client Error: Not Found for url: https://api.example.com/users/99`,
  `Segmentation fault (core dumped)
Program received signal SIGSEGV, Segmentation fault.
0x00007ffff7a3d2b0 in __memcpy_avx_unaligned ()`,
  `RangeError: Maximum call stack size exceeded
    at Object.render (renderer.js:234:18)
    at Object.render (renderer.js:234:18)
    at Object.render (renderer.js:234:18)
    at Object.render (renderer.js:234:18)`,
  `Error: connect ECONNREFUSED 127.0.0.1:5432
    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1141:16)
    at emitErrorNT (net.js:1185:8)
    at process.processTicksAndRejections (internal/process/task_queues.js:82:21)`,
]

interface Props {
  onGenerate: (text: string, type: string) => void
  loading: boolean
}

const InputPanel: React.FC<Props> = ({ onGenerate, loading }) => {
  const [errorText, setErrorText] = useState('')
  const [poetryType, setPoetryType] = useState('七言绝句')
  const [truncationWarning, setTruncationWarning] = useState('')

  const handleExample = () => {
    const idx = Math.floor(Math.random() * EXAMPLES.length)
    setErrorText(EXAMPLES[idx])
    setTruncationWarning('')
  }

  const handleGenerate = () => {
    if (!errorText.trim()) {
      alert('先给我一个 bug 吧')
      return
    }
    let text = errorText
    if (text.length > 5000) {
      text = text.slice(0, 2000) + '\n...[已截断]...\n' + text.slice(-1000)
      setTruncationWarning('输入过长，已截取前2000与后1000字符')
    } else {
      setTruncationWarning('')
    }
    onGenerate(text, poetryType)
  }

  return (
    <div className="input-panel">
      <textarea
        rows={8}
        value={errorText}
        onChange={(e) => setErrorText(e.target.value)}
        placeholder="粘贴报错信息……"
        className="error-input"
        aria-label="报错信息输入"
      />
      <PoetryTypeSelector value={poetryType} onChange={setPoetryType} />
      {truncationWarning && <p className="warning">{truncationWarning}</p>}
      <div className="btn-row">
        <button
          type="button"
          className="btn-secondary"
          onClick={handleExample}
          disabled={loading}
        >
          试试示例
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? '诗人正在酝酿情绪……' : '作诗'}
        </button>
      </div>
    </div>
  )
}

export default InputPanel
