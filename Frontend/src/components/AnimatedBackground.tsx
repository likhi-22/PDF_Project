import { useRef } from 'react'
import { useNeonWavesBackground } from '../hooks/useNeonWavesBackground'

function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useNeonWavesBackground(canvasRef)

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="h-full w-full opacity-80"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(129,140,248,0.16),_transparent_55%)] mix-blend-screen" />
    </div>
  )
}

export default AnimatedBackground
