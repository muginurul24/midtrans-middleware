export type LoginFormValues = {
  email: string
  password: string
}

export type RegisterFormValues = {
  name: string
  email: string
  password: string
}

type AuthFormErrors<TFormValues> = Partial<Record<keyof TFormValues, string>>

function requiredText(label: string, value: string) {
  return value.trim().length === 0 ? `${label} wajib diisi.` : null
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function validateLoginForm(values: LoginFormValues): AuthFormErrors<LoginFormValues> {
  const errors: AuthFormErrors<LoginFormValues> = {}

  const emailError = requiredText('Email', values.email)
  if (emailError) {
    errors.email = emailError
  } else if (!isValidEmail(values.email)) {
    errors.email = 'Format email tidak valid.'
  }

  const passwordError = requiredText('Password', values.password)
  if (passwordError) {
    errors.password = passwordError
  }

  return errors
}

export function validateRegisterForm(values: RegisterFormValues): AuthFormErrors<RegisterFormValues> {
  const errors: AuthFormErrors<RegisterFormValues> = {}

  const nameError = requiredText('Nama', values.name)
  if (nameError) {
    errors.name = nameError
  }

  const emailError = requiredText('Email', values.email)
  if (emailError) {
    errors.email = emailError
  } else if (!isValidEmail(values.email)) {
    errors.email = 'Format email tidak valid.'
  }

  if (values.password.length === 0) {
    errors.password = 'Password wajib diisi.'
  } else if (values.password.length < 8) {
    errors.password = 'Password minimal 8 karakter.'
  }

  return errors
}
