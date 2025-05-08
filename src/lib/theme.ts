export type Theme = 'dark' | 'system' | 'light' // Added light for flexibility

// Get system theme preference
export const getSystemTheme = (): 'dark' | 'light' => {
  if (
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark'
  }
  return 'light'
}

// Apply theme to document
export const applyTheme = (theme: Theme) => {
  const root = window.document.documentElement

  // Clean up
  root.classList.remove('dark')

  // Apply theme
  if (theme === 'dark' || (theme === 'system' && getSystemTheme() === 'dark')) {
    root.classList.add('dark')
    root.style.colorScheme = 'dark'
  } else {
    root.style.colorScheme = 'light'
  }

  // Store preference
  localStorage.setItem('theme', theme)
}

// Initialize theme on load
export const initializeTheme = () => {
  const storedTheme = localStorage.getItem('theme') as Theme | null
  const theme: Theme = storedTheme || 'system'
  applyTheme(theme)

  // Update on system preference change
  if (theme === 'system') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mediaQuery.addEventListener('change', handler)
    // Cleanup listener on component unmount
    return () => mediaQuery.removeEventListener('change', handler)
  }

  return theme
}
