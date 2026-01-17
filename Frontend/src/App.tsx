import { useRef } from 'react'
import ApplicationSection from './components/sections/ApplicationSection'
import AnimatedBackground from './components/AnimatedBackground'
import Footer from './components/Footer'
function App() {
  const appSectionRef = useRef<HTMLDivElement | null>(null)

  const handleScrollToApp = () => {
    if (appSectionRef.current) {
      appSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <div className="relative overflow-hidden">
        {/* Background Gradients */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_#e2e8f0_0,_#f8fafc_55%)] dark:bg-[radial-gradient(circle_at_top,_#1f2937_0,_#020617_55%)] opacity-80 transition-all duration-300" />
        <AnimatedBackground />
        <div className="relative z-10 flex min-h-screen flex-col">
          <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur transition-colors duration-300">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
              <button
                onClick={handleScrollToTop}
                className="flex items-center space-x-3 text-left"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 shadow-[0_0_40px_rgba(56,189,248,0.4)] dark:shadow-[0_0_40px_rgba(56,189,248,0.6)]">
                  <span className="text-lg font-semibold text-white dark:text-slate-950">P</span>
                </div>
                <div>
                  <div className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                    PDF Signer
                  </div>
                </div>
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleScrollToApp}
                  className="inline-flex items-center rounded-full bg-sky-500 px-4 py-2 text-xs font-semibold text-white dark:text-slate-950 shadow-[0_0_35px_rgba(56,189,248,0.5)] dark:shadow-[0_0_35px_rgba(56,189,248,0.7)] transition hover:bg-sky-400 sm:px-5 sm:text-sm"
                >
                  Get Started
                </button>
              </div>
            </div>
          </header>

          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:px-8">
            <section className="grid gap-12 pb-16 md:grid-cols-1 md:items-center">
              <div className="space-y-6">
                <p className="inline-flex items-center rounded-full border border-sky-500/50 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-600 dark:text-sky-300 shadow-[0_0_25px_rgba(56,189,248,0.2)] dark:shadow-[0_0_25px_rgba(56,189,248,0.35)]">
                  PDF Signer · Professional PDF Signing Made Simple
                </p>
                <h1 className="text-balance text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl lg:text-5xl">
                  The modern way to sign PDFs
                  <span className="block text-sky-500 dark:text-sky-300">
                    Secure, consistent signatures on every page.
                  </span>
                </h1>
                <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
                  Upload your PDF, add your signature once, and apply it
                  automatically to every page. Designed for teams that need
                  clean, reliable, and professional signing in seconds.
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    onClick={handleScrollToApp}
                    className="inline-flex items-center rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white dark:text-slate-950 shadow-[0_0_40px_rgba(56,189,248,0.5)] dark:shadow-[0_0_40px_rgba(56,189,248,0.7)] transition hover:bg-sky-400"
                  >
                    Start Signing
                  </button>
                  {/* Single primary action; no redundant workflow link */}
                </div>
              </div>

              {/* Live preview box removed per request */}
            </section>

            <section ref={appSectionRef} id="workflow" className="border-t border-slate-200 dark:border-slate-800 pt-12 transition-colors duration-300">
              <ApplicationSection sectionRef={appSectionRef} />
            </section>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}

export default App
