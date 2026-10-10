function countStackLines(text: string): number {
  return text.split('\n').filter(l =>
    /^\s+at /.test(l) ||
    /File "/.test(l) ||
    /\tat /.test(l) ||
    /line \d+/.test(l)
  ).length
}

function hasRepeatedLines(text: string): boolean {
  const lines = text.split('\n').filter(l => l.trim().length > 0)
  const counts = new Map<string, number>()
  for (const line of lines) {
    counts.set(line, (counts.get(line) ?? 0) + 1)
    if ((counts.get(line) ?? 0) >= 3) return true
  }
  return false
}

export function calcAestheticScore(errorText: string): number {
  let score = 0
  score += Math.min(40, Math.floor(errorText.length / 50))
  score += Math.min(30, countStackLines(errorText) * 2)
  if (hasRepeatedLines(errorText)) score += 10
  if (/Error|Exception/i.test(errorText)) score += 10
  if (/fatal|crash|segfault|SIGSEGV|killed/i.test(errorText)) score += 15
  if (/warning/i.test(errorText)) score -= 5
  return Math.max(0, Math.min(100, score))
}

export function getScoreLabel(score: number): string {
  if (score <= 30) return '小病呻吟'
  if (score <= 70) return '黯然神伤'
  return '肝肠寸断'
}
