import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
}

const Input: React.FC<InputProps> = ({ icon, className, ...props }) => (
  <div className="relative">
    {icon && (
      <div className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400 dark:text-tmechs-light/60">
        {icon}
      </div>
    )}
    <input className={`input ${icon ? 'pl-10' : ''} ${className}`} {...props} />
  </div>
)

export default Input
