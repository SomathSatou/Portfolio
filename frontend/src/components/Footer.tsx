export default function Footer() {
  return (
    <footer className="border-t border-white/10 dark:border-gray-800" style={{ background: 'rgba(95, 42, 98, 0.08)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-gray-600 dark:text-gray-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>© {new Date().getFullYear()} Thomas Saout</span>
        <span className="text-gray-400">FR/EN bientôt • Django + React</span>
      </div>
    </footer>
  )
}
