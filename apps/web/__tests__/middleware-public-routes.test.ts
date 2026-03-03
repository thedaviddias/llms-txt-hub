import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('middleware public route coverage', () => {
  it('keeps extension lifecycle pages public', () => {
    const middlewarePath = join(process.cwd(), 'middleware.ts')
    const source = readFileSync(middlewarePath, 'utf8')

    expect(source).toContain("'/extension(.*)'")
    expect(source).toContain("'/api/extension-feedback(.*)'")
  })
})
