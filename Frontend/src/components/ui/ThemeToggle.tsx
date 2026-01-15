import { useTheme } from "../ThemeProvider"

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="h-9 w-9 rounded-full
                 bg-slate-200 dark:bg-slate-800
                 text-slate-900 dark:text-slate-100
                 flex items-center justify-center
                 transition-colors"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? "🌙" : "☀️"}
    </button>
  )
}
