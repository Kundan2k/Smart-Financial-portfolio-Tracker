from sqlalchemy import Column, Integer, Numeric, String, Date, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from db.database import Base

ASSET_TYPES = (
    "Stock", "Crypto", "ETF", "Mutual Fund",
    "Bond", "Real Estate", "Commodity", "Other"
)


class Investment(Base):
    __tablename__ = "investments"

    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    asset_name     = Column(String(120),   nullable=False)
    asset_type     = Column(String(60),    nullable=False)
    ticker         = Column(String(20),    nullable=True)    # optional stock/crypto symbol
    quantity       = Column(Numeric(18, 8), nullable=False)  # supports crypto decimals
    purchase_price = Column(Numeric(14, 4), nullable=False)
    purchase_date  = Column(Date,          nullable=True)
    notes          = Column(String(255),   nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="investments")