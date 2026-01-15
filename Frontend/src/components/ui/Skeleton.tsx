import { motion, HTMLMotionProps } from 'framer-motion'

interface SkeletonProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  animation?: 'pulse' | 'wave' | 'none'
}

const Skeleton = ({
  variant = 'rectangular',
  animation = 'pulse',
  className = '',
  ...props
}: SkeletonProps) => {
  const baseStyles = 'bg-gray-200 dark:bg-gray-700'

  const variantStyles = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg',
  }

  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent',
    none: '',
  }

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${animationStyles[animation]} ${className}`.trim()

  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      className={combinedClassName}
      {...props}
    />
  )
}

// Skeleton components for common use cases
export const SkeletonText = ({ lines = 3, className = '' }: { lines?: number; className?: string }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        key={index}
        variant="text"
        className={`h-4 ${index === lines - 1 ? 'skeleton-w-75pct' : 'w-full'}`}
      />
    ))}
  </div>
)

export const SkeletonCard = ({ className = '' }: { className?: string }) => (
  <div className={`bg-white rounded-2xl shadow-soft border border-gray-200/50 p-6 ${className}`}>
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <Skeleton variant="circular" className="skeleton-w-48px skeleton-h-48px" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="skeleton-w-60pct skeleton-h-20px" />
          <Skeleton variant="text" className="skeleton-w-40pct skeleton-h-16px" />
        </div>
      </div>
      <SkeletonText lines={3} />
      <div className="flex space-x-2">
        <Skeleton variant="rounded" className="skeleton-w-100px skeleton-h-40px" />
        <Skeleton variant="rounded" className="skeleton-w-100px skeleton-h-40px" />
      </div>
    </div>
  </div>
)

export const SkeletonUploadArea = ({ className = '' }: { className?: string }) => (
  <div className={`bg-white rounded-2xl shadow-soft border border-gray-200/50 p-12 ${className}`}>
    <div className="text-center space-y-4">
      <Skeleton variant="circular" className="skeleton-w-64px skeleton-h-64px mx-auto" />
      <div className="space-y-2">
        <Skeleton variant="text" className="skeleton-w-60pct skeleton-h-24px mx-auto" />
        <Skeleton variant="text" className="skeleton-w-40pct skeleton-h-16px mx-auto" />
      </div>
      <Skeleton variant="rounded" className="skeleton-w-150px skeleton-h-44px mx-auto" />
    </div>
  </div>
)

export default Skeleton
