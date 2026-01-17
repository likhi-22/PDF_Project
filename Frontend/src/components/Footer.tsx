function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-slate-200 bg-white/80 px-4 py-4 text-xs text-slate-600 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-center sm:text-left">
          © {currentYear} PDF Signer. All rights reserved.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-end">
          <a
            href="mailto:contact@example.com"
            className="transition-colors hover:text-sky-500"
          >
            contact@example.com
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-sky-500"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
