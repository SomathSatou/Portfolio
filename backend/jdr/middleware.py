from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser, User
from rest_framework_simplejwt.tokens import AccessToken


@database_sync_to_async
def get_user_from_token(token_str: str):
    try:
        token = AccessToken(token_str)
        return User.objects.get(id=token['user_id'])
    except Exception:
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """Authenticate WebSocket connections via JWT.

    Le token est transmis via le sous-protocole WebSocket (``Sec-WebSocket-Protocol``)
    plutôt que la query string, afin d'éviter qu'il ne se retrouve dans les logs
    d'accès Nginx. La query string ``?token=`` reste supportée en fallback pour
    compatibilité, mais son usage est déconseillé.
    """

    async def __call__(self, scope, receive, send):
        token = None

        subprotocols = scope.get('subprotocols') or []
        for proto in subprotocols:
            if proto.startswith('jwt.'):
                token = proto[len('jwt.'):]
                break

        if not token:
            query_string = scope.get('query_string', b'').decode()
            params = parse_qs(query_string)
            token_list = params.get('token', [])
            if token_list:
                token = token_list[0]

        scope['user'] = await get_user_from_token(token) if token else AnonymousUser()
        return await super().__call__(scope, receive, send)
