import type { Notification } from './types'

interface NotificationListProps {
  notifications: Notification[]
  onMarkAllRead: () => void
  onMarkRead: (id: number) => void
}

const typeIcons: Record<Notification['notification_type'], string> = {
  info: 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z',
  alert: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  intersession: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  lore: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
  message: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75',
}

const typeColors: Record<Notification['notification_type'], string> = {
  info: 'text-blue-500',
  alert: 'text-red-500',
  intersession: 'text-accent3',
  lore: 'text-accent2',
  message: 'text-primary dark:text-primaryLight',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

export default function NotificationList({ notifications, onMarkAllRead, onMarkRead }: NotificationListProps) {
  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (notifications.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
        Aucune notification.
      </div>
    )
  }

  return (
    <div>
      {unreadCount > 0 && (
        <div className="flex items-center justify-between px-1 pb-3">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {unreadCount} non lue{unreadCount !== 1 ? 's' : ''}
          </span>
          <button
            onClick={onMarkAllRead}
            className="text-xs text-primary dark:text-primaryLight hover:underline"
          >
            Tout marquer comme lu
          </button>
        </div>
      )}

      <ul className="space-y-2 max-h-80 overflow-y-auto">
        {notifications.map((notif) => (
          <li key={notif.id}>
            <button
              onClick={() => {
                if (!notif.is_read) onMarkRead(notif.id)
                if (notif.link) window.location.hash = notif.link
              }}
              className={`
                w-full text-left flex items-start gap-3 p-2 rounded-md transition-colors
                ${notif.is_read
                  ? 'bg-transparent opacity-60'
                  : 'bg-primary/5 dark:bg-primary/10'
                }
                hover:bg-primary/10 dark:hover:bg-primary/20
              `}
            >
              <svg
                className={`w-5 h-5 mt-0.5 shrink-0 ${typeColors[notif.notification_type]}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={typeIcons[notif.notification_type]} />
              </svg>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {notif.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  {notif.message}
                </p>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                  {timeAgo(notif.created_at)}
                </span>
              </div>
              {!notif.is_read && (
                <span className="w-2 h-2 rounded-full bg-accent3 mt-1.5 shrink-0" />
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
