/**
 * Mock for nuqs package that causes Jest import issues
 */

// Mock the useQueryState hook
export function useQueryState(_key: string, options: any = {}) {
  const [state, setState] = require('react').useState(options.defaultValue || null)

  /**
   * Set query state value
   * @param value - Value to set
   * @returns Promise that resolves when set
   */
  const setQueryState = (value: any) => {
    setState(value)
    // Return a promise to match the real API
    return Promise.resolve()
  }

  return [state, setQueryState]
}

/**
 * Mock useQueryStates hook
 * @returns Array with empty state object and setter function
 */
export function useQueryStates() {
  return [{}, () => Promise.resolve()]
}

export const parseAsString = {
  withDefault: (defaultValue: string) => ({
    defaultValue,
    parse: (value: string) => value,
    serialize: (value: string) => value
  })
}

export const parseAsInteger = {
  withDefault: (defaultValue: number) => ({
    defaultValue,
    parse: (value: string) => Number.parseInt(value, 10),
    serialize: (value: number) => value.toString()
  })
}
