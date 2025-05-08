// Card.tsx
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={`rounded-lg bg-[var(--color-card)] p-6 shadow-md dark:shadow-tmechs-forest/50 ${className}`}
  >
    {children}
  </div>
)
