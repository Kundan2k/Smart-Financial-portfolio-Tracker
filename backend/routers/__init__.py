from .portfolio   import router as portfolio_router
from .auth        import router as auth_router
from .expenses    import router as expenses_router
from .analytics   import router as analytics_router
from .investments import router as investments_router
from .ml          import router as ml_router
from .fraud       import router as fraud_router

__all__ = [
    "portfolio_router", "auth_router",
    "expenses_router",  "analytics_router",
    "investments_router", "ml_router",
    "fraud_router",
]