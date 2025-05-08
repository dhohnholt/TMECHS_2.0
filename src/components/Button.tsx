import React from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive'
  isLoading?: boolean
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  isLoading,
  children,
  className,
  ...props
}) => {
  const baseStyles =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'destructive'
        ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
        : 'btn-secondary'

  return (
    <button
      className={`flex items-center ${baseStyles} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
      {children}
    </button>
  )
}

export default Button
