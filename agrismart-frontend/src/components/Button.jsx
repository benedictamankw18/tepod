const VARIANTS = {
  primary: 'bg-leaf text-white hover:bg-leaf-dark',
  secondary: 'border border-line bg-white text-ink hover:bg-paper',
  danger: 'border border-bad/40 bg-white text-bad-text hover:bg-bad',
  'danger-solid': 'border border-bad/40 bg-bad text-bad-text hover:bg-bad-soft',
  ghost: 'text-muted hover:bg-paper hover:text-ink',
  lime: 'bg-lime-soft text-leaf-dark hover:bg-lime',
}

const SIZES = {
  sm: 'rounded-[8px] px-3 py-1.5 text-xs',
  md: 'rounded-btn px-4 py-2.5 text-sm',
  lg: 'rounded-[12px] px-5 py-3 text-sm',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...rest
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 font-sans font-semibold transition duration-base ease-out disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    />
  )
}