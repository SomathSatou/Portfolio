import random
import re
import time
from collections import deque

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.conf import settings

from .models import Campaign, CampaignMembership, Character, ChatMessage


def _resolve_author_info(user, campaign_id) -> dict:
    """Return author display name and avatar URL for a chat message."""
    avatar_url = None
    try:
        campaign = Campaign.objects.get(pk=campaign_id)
    except Campaign.DoesNotExist:
        return {'name': user.username, 'avatar': None}
    if campaign.game_master_id == user.id:
        return {'name': f'{user.username} (MJ)', 'avatar': None}
    char = Character.objects.filter(player=user, campaign=campaign).first()
    if char:
        avatar_url = char.avatar.url if char.avatar else None
        return {'name': char.name, 'avatar': avatar_url}
    return {'name': user.username, 'avatar': avatar_url}


DICE_PATTERN = re.compile(r'^(\d{1,3})d(\d{1,4})([+-]\d{1,6})?$')

# Bornes resserrées à des valeurs réalistes de JDR (évite payloads de résultats énormes)
DICE_MAX_COUNT = 20
DICE_MAX_SIDES = 1000


def parse_dice_command(text: str, keep: str | None = None) -> dict | None:
    """Parse a dice command like '2d20', '1d20+5', '3d6-2' and return roll results, or None.

    ``keep`` (optionnel) : 'highest' ou 'lowest' pour un jet avec avantage/désavantage
    (garde uniquement le meilleur ou le pire résultat parmi les dés lancés).
    """
    text = text.strip()
    match = DICE_PATTERN.match(text)
    if not match:
        return None
    count = int(match.group(1))
    sides = int(match.group(2))
    modifier = int(match.group(3)) if match.group(3) else 0
    if count < 1 or count > DICE_MAX_COUNT or sides < 1 or sides > DICE_MAX_SIDES:
        return None
    rolls = [random.randint(1, sides) for _ in range(count)]
    result = {
        'command': text,
        'rolls': rolls,
        'modifier': modifier,
        'total': sum(rolls) + modifier,
    }
    if keep in ('highest', 'lowest') and len(rolls) > 1:
        idx = rolls.index(max(rolls)) if keep == 'highest' else rolls.index(min(rolls))
        result['keep'] = keep
        result['kept_index'] = idx
        result['total'] = rolls[idx] + modifier
    return result


class ChatConsumer(AsyncJsonWebsocketConsumer):
    """WebSocket consumer for campaign chat with dice rolling."""

    async def connect(self):
        self.campaign_id = self.scope['url_route']['kwargs']['campaign_id']
        self.group_name = f'jdr_chat_{self.campaign_id}'
        self.user = self.scope.get('user')
        self._recent_message_times: deque = deque(
            maxlen=settings.JDR_CHAT_RATE_LIMIT_COUNT,
        )

        # Reject if not authenticated
        if not self.user or self.user.is_anonymous:
            await self.close()
            return

        # Verify campaign access
        access = await self._check_access()
        if not access:
            await self.close()
            return
        self.is_mj = access == 'mj'
        self.personal_group = f'{self.group_name}_user_{self.user.id}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.channel_layer.group_add(self.personal_group, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        if hasattr(self, 'personal_group'):
            await self.channel_layer.group_discard(self.personal_group, self.channel_name)

    def _is_rate_limited(self) -> bool:
        now = time.monotonic()
        window = settings.JDR_CHAT_RATE_LIMIT_WINDOW_SECONDS
        if (
            len(self._recent_message_times) == self._recent_message_times.maxlen
            and now - self._recent_message_times[0] < window
        ):
            return True
        self._recent_message_times.append(now)
        return False

    async def receive_json(self, content, **kwargs):
        # Indicateur de saisie ("X est en train d'écrire…") — non persisté
        if content.get('type') == 'typing':
            await self.channel_layer.group_send(
                self.group_name,
                {'type': 'typing_event', 'user_id': self.user.id},
            )
            return

        message_text = content.get('message', '').strip()
        if not message_text:
            return

        if self._is_rate_limited():
            await self.send_json({
                'type': 'error',
                'detail': 'Trop de messages envoyés, veuillez ralentir.',
            })
            return

        max_length = settings.JDR_CHAT_MESSAGE_MAX_LENGTH
        if len(message_text) > max_length:
            await self.send_json({
                'type': 'error',
                'detail': f'Message trop long (max {max_length} caractères).',
            })
            return

        # Jet privé/secret et chuchotement : réservés au MJ
        is_private = bool(content.get('private')) and self.is_mj
        whisper_to_id = content.get('whisper_to')
        whisper_to_id = int(whisper_to_id) if whisper_to_id and self.is_mj else None
        if whisper_to_id:
            valid_target = await self._is_valid_whisper_target(whisper_to_id)
            if not valid_target:
                whisper_to_id = None

        keep = content.get('keep') if content.get('keep') in ('highest', 'lowest') else None

        # Check for dice command
        dice_result = parse_dice_command(message_text, keep=keep)
        is_dice = dice_result is not None

        # Persist message
        msg = await self._save_message(message_text, is_dice, dice_result, is_private, whisper_to_id)

        payload = {
            'type': 'chat.message',
            'id': msg['id'],
            'author': msg['author'],
            'author_name': msg['author_name'],
            'author_avatar': msg['author_avatar'],
            'content': msg['content'],
            'is_dice_roll': msg['is_dice_roll'],
            'dice_result': msg['dice_result'],
            'is_private': msg['is_private'],
            'whisper_to': msg['whisper_to'],
            'whisper_to_name': msg['whisper_to_name'],
            'created_at': msg['created_at'],
        }

        if is_private:
            # Jet secret : visible uniquement par son auteur (le MJ)
            await self.channel_layer.group_send(self.personal_group, payload)
        elif whisper_to_id:
            # Chuchotement : visible par le MJ et le joueur ciblé uniquement
            await self.channel_layer.group_send(self.personal_group, payload)
            await self.channel_layer.group_send(f'{self.group_name}_user_{whisper_to_id}', payload)
        else:
            await self.channel_layer.group_send(self.group_name, payload)

    async def chat_message(self, event):
        """Send message to WebSocket client."""
        await self.send_json({
            'id': event['id'],
            'author': event['author'],
            'author_name': event['author_name'],
            'author_avatar': event.get('author_avatar'),
            'content': event['content'],
            'is_dice_roll': event['is_dice_roll'],
            'dice_result': event['dice_result'],
            'is_private': event.get('is_private', False),
            'whisper_to': event.get('whisper_to'),
            'whisper_to_name': event.get('whisper_to_name'),
            'created_at': event['created_at'],
        })

    async def typing_event(self, event):
        """Forward typing indicator to WebSocket client."""
        if event['user_id'] == self.user.id:
            return
        await self.send_json({
            'type': 'typing',
            'user_id': event['user_id'],
        })

    async def combat_event(self, event):
        """Forward combat state updates to WebSocket client."""
        await self.send_json({
            'type': 'combat_event',
            'event': event.get('event'),
            'combat': event.get('combat'),
        })

    async def inventory_update(self, event):
        """Notify clients that the campaign inventory has changed."""
        await self.send_json({
            'type': 'inventory_update',
            'campaign_id': event.get('campaign_id'),
        })

    @database_sync_to_async
    def _check_access(self) -> str | None:
        try:
            campaign = Campaign.objects.get(pk=self.campaign_id)
        except Campaign.DoesNotExist:
            return None
        if campaign.game_master == self.user:
            return 'mj'
        is_member = CampaignMembership.objects.filter(
            campaign=campaign, player=self.user, is_active=True,
        ).exists()
        return 'player' if is_member else None

    @database_sync_to_async
    def _is_valid_whisper_target(self, user_id: int) -> bool:
        return CampaignMembership.objects.filter(
            campaign_id=self.campaign_id, player_id=user_id, is_active=True,
        ).exists()

    @database_sync_to_async
    def _save_message(
        self, content: str, is_dice: bool, dice_result: dict | None,
        is_private: bool, whisper_to_id: int | None,
    ) -> dict:
        msg = ChatMessage.objects.create(
            campaign_id=self.campaign_id,
            author=self.user,
            content=content,
            is_dice_roll=is_dice,
            dice_result=dice_result,
            is_private=is_private,
            whisper_to_id=whisper_to_id,
        )
        info = _resolve_author_info(msg.author, self.campaign_id)
        return {
            'id': msg.id,
            'author': msg.author_id,
            'author_name': info['name'],
            'author_avatar': info['avatar'],
            'content': msg.content,
            'is_dice_roll': msg.is_dice_roll,
            'dice_result': msg.dice_result,
            'is_private': msg.is_private,
            'whisper_to': msg.whisper_to_id,
            'whisper_to_name': msg.whisper_to.username if msg.whisper_to_id else None,
            'created_at': msg.created_at.isoformat(),
        }
