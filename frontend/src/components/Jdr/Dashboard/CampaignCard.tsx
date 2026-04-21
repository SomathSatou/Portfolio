import { Crown, Users } from 'lucide-react'
import type { Campaign } from './types'

interface CampaignCardProps {
  campaign: Campaign
}

export default function CampaignCard({ campaign }: CampaignCardProps) {
  return (
    <a
      href={`#/jdr/campaign/${campaign.id}`}
      className="card-glass block no-underline animate-fadeIn"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-lg text-primary dark:text-primaryLight truncate">
          {campaign.name}
        </h3>
        <span className="badge shrink-0">Session #{campaign.current_session_number}</span>
      </div>

      {campaign.description && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {campaign.description}
        </p>
      )}

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
        <span className="flex items-center gap-1">
          <Crown className="w-4 h-4" />
          MJ : {campaign.game_master_name}
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          {campaign.member_count} joueur{campaign.member_count !== 1 ? 's' : ''}
        </span>
      </div>
    </a>
  )
}
