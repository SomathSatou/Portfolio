export default function Footer() {
  return (
    <footer className="border-t bg-white dark:bg-gray-900 dark:border-gray-800">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-gray-600 dark:text-gray-400 flex items-center justify-between">
        <span>© {new Date().getFullYear()} Thomas Saout</span>
        <span className="text-gray-400">FR/EN bientôt • Django + React</span>
      </div>
    </footer>
  )
}
