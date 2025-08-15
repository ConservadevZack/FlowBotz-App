"""
FlowBotz Backend Models
Comprehensive Pydantic models for all backend entities
"""

from .user import (
    User, UserCreate, UserUpdate, UserProfile, 
    TeamMember, TeamRole, UserPreferences
)
from .design import (
    Design, DesignCreate, DesignUpdate, DesignVersion, 
    DesignTemplate, DesignCategory, DesignTag,
    DesignCollaboration, DesignShare
)
from .ai import (
    AIProvider, AIModel, AIGenerationRequest, AIGenerationResponse,
    AIStylePreset, AIBatchRequest, AIUsageStats
)
from .analytics import (
    UserEvent, AnalyticsSession, ConversionFunnel,
    RevenueMetric, PerformanceMetric, ABTestResult
)
from .pod import (
    Product, ProductCategory, ProductVariant, ProductMockup,
    Order, OrderItem, OrderStatus, Inventory,
    PODProvider, ShippingRate
)
from .team import (
    Team, TeamCreate, TeamUpdate, TeamWorkspace,
    Permission, Role, TeamInvitation, TeamSettings
)
from .enterprise import (
    WhitelabelConfig, WebhookEndpoint, APIUsage,
    CustomDomain, BrandingSettings, IntegrationConfig
)
from .common import (
    BaseModel, TimestampMixin, PaginationParams,
    FilterParams, SortParams, ResponseModel
)

__all__ = [
    # User models
    "User", "UserCreate", "UserUpdate", "UserProfile",
    "TeamMember", "TeamRole", "UserPreferences",
    
    # Design models  
    "Design", "DesignCreate", "DesignUpdate", "DesignVersion",
    "DesignTemplate", "DesignCategory", "DesignTag",
    "DesignCollaboration", "DesignShare",
    
    # AI models
    "AIProvider", "AIModel", "AIGenerationRequest", "AIGenerationResponse", 
    "AIStylePreset", "AIBatchRequest", "AIUsageStats",
    
    # Analytics models
    "UserEvent", "AnalyticsSession", "ConversionFunnel",
    "RevenueMetric", "PerformanceMetric", "ABTestResult",
    
    # POD models
    "Product", "ProductCategory", "ProductVariant", "ProductMockup",
    "Order", "OrderItem", "OrderStatus", "Inventory",
    "PODProvider", "ShippingRate",
    
    # Team models
    "Team", "TeamCreate", "TeamUpdate", "TeamWorkspace",
    "Permission", "Role", "TeamInvitation", "TeamSettings",
    
    # Enterprise models
    "WhitelabelConfig", "WebhookEndpoint", "APIUsage",
    "CustomDomain", "BrandingSettings", "IntegrationConfig",
    
    # Common models
    "BaseModel", "TimestampMixin", "PaginationParams",
    "FilterParams", "SortParams", "ResponseModel"
]