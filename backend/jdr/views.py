# Aggregation -- no logic here.
# Each domain is defined in its own views_*.py module.
# This file re-exports all symbols for urls.py compatibility.

from accounts.views import PasswordResetConfirmView, PasswordResetRequestView  # noqa: F401
from .views_auth import JdrLoginView, JdrMeView, RegisterView  # noqa: F401
from .views_campaigns import CampaignViewSet  # noqa: F401
from .views_characters import CharacterViewSet  # noqa: F401
from .views_content import (  # noqa: F401
    CampaignSettingsView,
    CharacterItemDetailView,
    CharacterItemsView,
    CharacterPassiveSkillRemoveView,
    CharacterPassiveSkillsView,
    CharacterSkillRemoveView,
    CharacterSkillsView,
    CharacterSpellRemoveView,
    CharacterSpellsView,
    CharacterStatsView,
    ItemDetailView,
    ItemListCreateView,
    MonsterDetailView,
    MonsterListCreateView,
    PassiveSkillDetailView,
    PassiveSkillListCreateView,
    SkillDetailView,
    SkillListCreateView,
    SpellDetailView,
    SpellListCreateView,
    StatDetailView,
    StatListCreateView,
    _check_campaign_access,
    _check_campaign_mj,
)
from .views_notifications import NotificationViewSet  # noqa: F401
from .views_economy import (  # noqa: F401
    AVAILABILITY_RANGES,
    CityViewSet,
    MarketView,
    ResourceViewSet,
    compute_fluctuated_price,
    generate_market_prices,
)
from .views_merchant import (  # noqa: F401
    MerchantInventoryView,
    MerchantOrderSellView,
    MerchantOrderView,
    MerchantStatsView,
    SellEstimateView,
)
from .views_garden import (  # noqa: F401
    AlchemyPlantViewSet,
    GardenHistoryView,
    GardenInventoryView,
    GardenMutationLogsView,
    GardenPlotClearView,
    GardenPlotFertilizeView,
    GardenPlotHarvestView,
    GardenPlotPlantView,
    GardenPlotsView,
    GardenRecipesView,
    GardenSellView,
    GardenStatsView,
    advance_garden_session,
)
from .views_runes import (  # noqa: F401
    RuneCollectionView,
    RuneDrawingAnnotationsUpdateView,
    RuneDrawingDetailView,
    RuneDrawingHistoryListView,
    RuneDrawingListCreateView,
    RuneDrawingReviewView,
    RuneDrawingSubmitView,
    RuneFavoriteToggleView,
    RunePendingView,
    RuneTemplateViewSet,
)
from .views_files import (  # noqa: F401
    NextcloudEmbedUrlView,
    SharedFolderContentView,
    SharedFolderDetailView,
    SharedFolderListCreateView,
    SharedFolderUploadView,
)
from .views_session import (  # noqa: F401
    CharacterAvatarUploadView,
    CharactersWithStatsView,
    ChatMessageView,
    SessionNoteView,
    WalletUpdateView,
)
from .views_combat import (  # noqa: F401
    CombatAddParticipantView,
    CombatEndView,
    CombatNextTurnView,
    CombatStartView,
    CombatStateView,
    CombatUpdateHpView,
)
from .views_campaign_inventory import (  # noqa: F401
    CampaignInventoryTransferView,
    CampaignInventoryView,
)
