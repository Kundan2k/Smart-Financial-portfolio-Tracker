from sqlalchemy import Column, Integer, Numeric, String, Date, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from db.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    amount      = Column(Numeric(12, 2), nullable=False)   # +income / -expense
    category    = Column(String(80), nullable=False)
    description = Column(String(255), nullable=True)
    date        = Column(Date, nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="transactions")