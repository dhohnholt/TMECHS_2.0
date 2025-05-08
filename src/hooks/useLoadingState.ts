import { useState, useCallback } from 'react'

export function useLoadingState(initialState = false) {
  const [isLoading, setIsLoading] = useState(initialState)
  const [error, setError] = useState<Error | null>(null)

  const withLoading = useCallback(async (fn: () => Promise<void>) => {
    try {
      setIsLoading(true)
      setError(null)
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { isLoading, error, withLoading }
}
