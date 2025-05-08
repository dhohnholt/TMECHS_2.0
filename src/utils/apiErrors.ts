export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const handleApiError = (error: unknown) => {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        // Handle unauthorized
        window.location.href = '/login'
        break
      case 403:
        // Handle forbidden
        break
      case 404:
        // Handle not found
        break
      default:
        // Handle other errors
        break
    }
  }
  throw error
}
