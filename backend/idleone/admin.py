from django.contrib import admin

from .models import IdleOneProfile, IdleOneSave


@admin.register(IdleOneProfile)
class IdleOneProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'last_login_at', 'last_sync_at', 'created_at')
    search_fields = ('user__username', 'user__email')


@admin.register(IdleOneSave)
class IdleOneSaveAdmin(admin.ModelAdmin):
    list_display = ('user', 'slot', 'player_name', 'run_count', 'save_version', 'updated_at')
    list_filter = ('slot', 'save_version')
    search_fields = ('user__username', 'player_name')
    readonly_fields = ('data',)
