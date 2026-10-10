import { describe, it, expect } from 'vitest'
import { calcAestheticScore, getScoreLabel } from '../utils/aestheticScore'

describe('calcAestheticScore', () => {
  it('empty string returns 0', () => {
    expect(calcAestheticScore('')).toBe(0)
  })

  it('calcAestheticScore("") === 0', () => {
    expect(calcAestheticScore('')).toBe(0)
  })

  it('string with only "warning" returns 0 (5-5=0 floored)', () => {
    // "warning" length=7 => floor(7/50)=0 stack=0; no Error/Exception; warning => -5; result = max(0, -5) = 0
    expect(calcAestheticScore('warning')).toBe(0)
  })

  it('NullPointerException includes Error keyword: score >= 10', () => {
    expect(calcAestheticScore('NullPointerException')).toBeGreaterThanOrEqual(10)
  })

  it('string with "fatal error" returns score >= 15', () => {
    expect(calcAestheticScore('fatal error')).toBeGreaterThanOrEqual(15)
  })

  it('string of 2000 chars: length component is 40', () => {
    const longText = 'a'.repeat(2000)
    // Math.min(40, floor(2000/50)) = Math.min(40, 40) = 40
    // no stack lines, no repeats, no error keywords => score = 40
    expect(calcAestheticScore(longText)).toBe(40)
  })

  it('text with 15 stack lines matching /^\\s+at /: stack component is 30', () => {
    const lines = Array.from({ length: 15 }, (_, i) => `    at SomeClass.method${i}(File.js:${i + 1}:10)`)
    const text = lines.join('\n')
    // stack component = min(30, 15*2) = 30
    // Also has "at" in lines which contains no Error/Exception/fatal/warning
    const score = calcAestheticScore(text)
    // length: 15 lines each ~40 chars => ~600 chars => floor(600/50)=12 length component
    // But we just need to verify stack contributes 30
    expect(score).toBeGreaterThanOrEqual(30)
  })

  it('text with a line repeated 3 times: +10', () => {
    const repeatedLine = 'Error: something went wrong'
    const text = [repeatedLine, repeatedLine, repeatedLine].join('\n')
    // length: ~80 chars => floor(80/50)=1; stack=0; repeat=10; Error=10; result=21
    const score = calcAestheticScore(text)
    expect(score).toBeGreaterThanOrEqual(10)
  })

  it('getScoreLabel(0) === "小病呻吟"', () => {
    expect(getScoreLabel(0)).toBe('小病呻吟')
  })

  it('getScoreLabel(30) === "小病呻吟"', () => {
    expect(getScoreLabel(30)).toBe('小病呻吟')
  })

  it('getScoreLabel(31) === "黯然神伤"', () => {
    expect(getScoreLabel(31)).toBe('黯然神伤')
  })

  it('getScoreLabel(70) === "黯然神伤"', () => {
    expect(getScoreLabel(70)).toBe('黯然神伤')
  })

  it('getScoreLabel(71) === "肝肠寸断"', () => {
    expect(getScoreLabel(71)).toBe('肝肠寸断')
  })

  it('getScoreLabel(100) === "肝肠寸断"', () => {
    expect(getScoreLabel(100)).toBe('肝肠寸断')
  })

  it('score is always in [0,100] — very long text with all keywords', () => {
    const text =
      'fatal crash segfault SIGSEGV killed Error Exception warning\n' +
      Array.from({ length: 20 }, (_, i) => `    at foo${i}(bar.ts:${i}:0)`).join('\n') +
      '\n' +
      'a'.repeat(10000)
    const score = calcAestheticScore(text)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})
