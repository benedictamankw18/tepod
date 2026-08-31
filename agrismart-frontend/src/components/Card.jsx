export default function Card({ as: Tag = 'div', className = '', hover = false, ...rest }) {
  return (
    <Tag
      className={`rounded-card border border-line bg-white shadow transition duration-base ease-out ${
        hover ? 'cursor-pointer hover-lift' : ''
      } ${className}`}
      {...rest}
    />
  )
}