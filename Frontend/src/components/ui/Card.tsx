import { motion, HTMLMotionProps } from 'framer-motion'
import { ReactNode } from 'react'

interface CardProps extends HTMLMotionProps<'div'> {
  children: ReactNode
  variant?: 'default' | 'elevated' | 'outlined' | 'flat'
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const Card = ({
  children,
  variant = 'default',
  hover = false,
  padding = 'md',
  className = '',
  ...props
}: CardProps) => {
  const baseStyles = 'rounded-2xl transition-all duration-300'

  const variantStyles = {
    default: 'bg-slate-900/80 border border-slate-800 shadow-[0_18px_45px_rgba(0,0,0,0.55)]',
    elevated: 'bg-slate-950/90 border border-slate-700 shadow-[0_24px_70px_rgba(0,0,0,0.75)]',
    outlined: 'bg-slate-950/80 border-2 border-slate-700 shadow-none',
    flat: 'bg-slate-900/60 border border-slate-800 shadow-none',
  }

  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6 md:p-8',
    lg: 'p-8 md:p-10',
  }

  const hoverStyles = hover ? 'hover:shadow-medium hover:-translate-y-1 transition-all duration-300 cursor-pointer focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2' : ''

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${hoverStyles} ${className}`.trim()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : {}}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={combinedClassName}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export default Card
