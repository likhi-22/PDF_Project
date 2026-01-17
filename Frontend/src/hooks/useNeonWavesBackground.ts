import { useEffect, RefObject } from 'react'

export function useNeonWavesBackground(canvasRef: RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    let animationFrameId: number
    let devicePixelRatio = window.devicePixelRatio || 1

    const resize = () => {
      const width = window.innerWidth
      const height = document.documentElement.scrollHeight || window.innerHeight
      canvas.width = width * devicePixelRatio
      canvas.height = height * devicePixelRatio
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    }

    resize()

    const handleResize = () => {
      devicePixelRatio = window.devicePixelRatio || 1
      resize()
    }

    window.addEventListener('resize', handleResize)

    const waves = [
      { amplitude: 42, wavelength: 260, speed: 0.0006, offset: 0 },
      { amplitude: 32, wavelength: 180, speed: -0.00045, offset: Math.PI / 2 },
      { amplitude: 18, wavelength: 120, speed: 0.00085, offset: Math.PI },
    ]

    const particles = Array.from({ length: 42 }).map(() => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      radius: 0.6 + Math.random() * 1.6,
      speedY: 0.06 + Math.random() * 0.18,
      alpha: 0.2 + Math.random() * 0.5,
    }))

    const drawFrame = (timestamp: number) => {
      const width = canvas.width / devicePixelRatio
      const height = canvas.height / devicePixelRatio

      context.clearRect(0, 0, width, height)

      const backgroundGradient = context.createLinearGradient(0, 0, 0, height)
      backgroundGradient.addColorStop(0, 'rgba(15,23,42,0.9)')
      backgroundGradient.addColorStop(0.4, 'rgba(15,23,42,0.96)')
      backgroundGradient.addColorStop(1, 'rgba(15,23,42,1)')
      context.fillStyle = backgroundGradient
      context.fillRect(0, 0, width, height)

      context.globalCompositeOperation = 'lighter'

      const bandCenters = [height * 0.32, height * 0.68]

      bandCenters.forEach((baseY, bandIndex) => {
        waves.forEach((wave, index) => {
          context.beginPath()

          const hueStart = index === 0 ? 190 : index === 1 ? 215 : 280
          const hueEnd = index === 0 ? 210 : index === 1 ? 260 : 305

          const gradient = context.createLinearGradient(0, baseY - 120, width, baseY + 80)
          gradient.addColorStop(0, `hsla(${hueStart}, 95%, 65%, ${bandIndex === 0 ? 0.18 : 0.10})`)
          gradient.addColorStop(0.5, `hsla(${(hueStart + hueEnd) / 2}, 98%, 72%, ${bandIndex === 0 ? 0.95 : 0.6})`)
          gradient.addColorStop(1, `hsla(${hueEnd}, 98%, 65%, ${bandIndex === 0 ? 0.16 : 0.08})`)

          const thickness = index === 0 ? 2.2 : index === 1 ? 1.7 : 1.2
          context.lineWidth = thickness
          context.strokeStyle = gradient

          const speedOffset = timestamp * wave.speed

          for (let x = -40; x <= width + 40; x += 16) {
            const k = (2 * Math.PI) / wave.wavelength
            const y =
              baseY +
              Math.sin(k * x + speedOffset + wave.offset) * wave.amplitude +
              Math.cos(k * x * 0.3 + speedOffset * 1.4) * 8

            if (x === -40) {
              context.moveTo(x, y)
            } else {
              context.lineTo(x, y)
            }
          }

          context.stroke()
        })
      })

      particles.forEach((particle) => {
        particle.y -= particle.speedY
        if (particle.y < -10) {
          particle.y = height + 10
          particle.x = Math.random() * width
        }

        context.beginPath()
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        context.fillStyle = `rgba(56,189,248,${particle.alpha})`
        context.fill()
      })

      context.globalCompositeOperation = 'source-over'

      animationFrameId = window.requestAnimationFrame(drawFrame)
    }

    animationFrameId = window.requestAnimationFrame(drawFrame)

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
    }
  }, [canvasRef])
}
