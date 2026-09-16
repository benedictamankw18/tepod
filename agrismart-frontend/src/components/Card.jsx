export default function Card({ as: Tag = 'div', className = '', hover = false, ...rest }) {
  return (
    <Tag
      className={`rounded-card border border-line bg-white transition duration-base ease-out ${
        hover
          ? 'hover:-translate-y-px hover:border-line-strong hover:shadow-lift'
          : 'shadow'
      } ${className}`}
      {...rest}
    />
  )
}