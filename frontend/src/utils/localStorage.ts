export interface HistoryEntry {
  id: string
  title: string
  poem: string[]
  note: string
  poetryType: string
  score: number
  label: string
  date: string
  isFreeForm?: boolean
}

const STORAGE_KEY = 'bugPoetHistory'

export function savePoem(entry: HistoryEntry): void {
  const existing = getHistory()
  existing.unshift(entry)
  const trimmed = existing.slice(0, 50)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
}

export function getHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as HistoryEntry[]
  } catch {
    return []
  }
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY)
}
