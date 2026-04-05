import random
import re

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

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


DICE_PATTERN = re.compile(r'^(\d{1,3})d(\d{1,4})$')


def parse_dice_command(text: str) -> dict | None:
    """Parse a dice command like '2d20' and return roll results, or None."""
    text = text.strip()
    match = DICE_PATTERN.match(text)
    if not match:
        return None
    count = int(match.group(1))
    sides = int(match.group(2))
    if count < 1 or count > 100 or sides < 1 or sides > 10000:
        return None
    rolls = [random.randint(1, sides) for _ in range(count)]
    return {
        'command': text,
        'rolls': rolls,
        'total': sum(rolls),
    }


class ChatConsumer(AsyncJsonWebsocketConsumer):
    """WebSocket consumer for campaign chat with dice rolling."""

    async def connect(self):
        self.campaign_id = self.scope['url_route']['kwargs']['campaign_id']
        self.group_name = f'jdr_chat_{self.campaign_id}'
        self.user = self.scope.get('user')

        # Reject if not authenticated
        if not self.user or self.user.is_anonymous:
            await self.close()
            return

        # Verify campaign access
        has_access = await self._check_access()
        if not has_access:
            await self.close()
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        message_text = content.get('message', '').strip()
        if not message_text:
            return

        # Check for dice command
        dice_result = parse_dice_command(message_text)
        is_dice = dice_result is not None

        # Persist message
        msg = await self._save_message(message_text, is_dice, dice_result)

        # Broadcast to group
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'chat.message',
                'id': msg['id'],
                'author': msg['author'],
                'author_name': msg['author_name'],
                'author_avatar': msg['author_avatar'],
                'content': msg['content'],
                'is_dice_roll': msg['is_dice_roll'],
                'dice_result': msg['dice_result'],
                'created_at': msg['created_at'],
            },
        )

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
            'created_at': event['created_at'],
        })

    @database_sync_to_async
    def _check_access(self) -> bool:
        try:
            campaign = Campaign.objects.get(pk=self.campaign_id)
        except Campaign.DoesNotExist:
            return False
        if campaign.game_master == self.user:
            return True
        return CampaignMembership.objects.filter(
            campaign=campaign, player=self.user, is_active=True,
        ).exists()

    @database_sync_to_async
    def _save_message(self, content: str, is_dice: bool, dice_result: dict | None) -> dict:
        msg = ChatMessage.objects.create(
            campaign_id=self.campaign_id,
            author=self.user,
            content=content,
            is_dice_roll=is_dice,
            dice_result=dice_result,
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
            'created_at': msg.created_at.isoformat(),
        }
