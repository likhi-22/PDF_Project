interface SkeletonProps {
  className?: string
  variant?: 'text' | 'rectangular' | 'circular'
  width?: string | number
  height?: string | number
}

const Skeleton = ({
  className = '',
  variant = 'text',
  width,
  height
}: SkeletonProps) => {
  const baseClasses = 'animate-pulse bg-gray-200'

  const variantClasses = {
    text: 'h-4 rounded',
    rectangular: 'rounded',
    circular: 'rounded-full'
  }

  const widthClass =
    width !== undefined
      ? typeof width === 'number'
        ? `w-[${width}px]`
        : `w-[${width}]`
      : ''
  const heightClass =
    height !== undefined
      ? typeof height === 'number'
        ? `h-[${height}px]`
        : `h-[${height}]`
      : ''

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${widthClass} ${heightClass} ${className}`}
      role="presentation"
      aria-hidden="true"
    />
  )
}

export default Skeleton
