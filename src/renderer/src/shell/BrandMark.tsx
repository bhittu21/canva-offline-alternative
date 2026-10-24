import logo from '@renderer/assets/logo.png'

/** The Design Studio logo: a gradient "D" with a dot. */
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }}>
      <img src={logo} width={size} height={size} alt="" draggable={false} />
    </span>
  )
}
