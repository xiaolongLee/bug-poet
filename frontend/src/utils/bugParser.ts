export function parseBugLocation(errorText: string): { filename: string | null; line: number | null } {
  // Pattern 1: JS — at SomeFunc (path/to/file.ts:10:5)
  const jsMatch = errorText.match(/at .+ \((.+?):(\d+):\d+\)/)
  if (jsMatch) {
    return { filename: jsMatch[1], line: parseInt(jsMatch[2], 10) }
  }

  // Pattern 2: Python — File "path/to/file.py", line 42
  const pyMatch = errorText.match(/File "(.+?)", line (\d+)/)
  if (pyMatch) {
    return { filename: pyMatch[1], line: parseInt(pyMatch[2], 10) }
  }

  // Pattern 3: Generic — filename.ext:line
  const genericMatch = errorText.match(/(\S+?\.(?:java|cpp|c|go|rs|rb|php|js|ts|py)):(\d+)/)
  if (genericMatch) {
    return { filename: genericMatch[1], line: parseInt(genericMatch[2], 10) }
  }

  return { filename: null, line: null }
}
