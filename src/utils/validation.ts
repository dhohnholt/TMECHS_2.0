export const validators = {
  required: (value: any) => (value ? null : 'This field is required'),

  email: (value: string) =>
    /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)
      ? null
      : 'Invalid email address',

  episd: (value: string) =>
    value.endsWith('@episd.org') ? null : 'Must be an EPISD email address',

  password: (value: string) =>
    value.length >= 8 ? null : 'Password must be at least 8 characters',

  barcode: (value: string) =>
    /^\d{6}$/.test(value) ? null : 'Barcode must be 6 digits',
}

export const validateForm = (
  values: Record<string, any>,
  rules: Record<string, Function[]>
) => {
  const errors: Record<string, string> = {}

  Object.entries(rules).forEach(([field, validations]) => {
    validations.some(validate => {
      const error = validate(values[field])
      if (error) {
        errors[field] = error
        return true
      }
      return false
    })
  })

  return errors
}
