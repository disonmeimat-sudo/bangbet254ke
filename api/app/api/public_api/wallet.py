from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.wallet import Wallet
from app.schemas.wallet import WalletResponse
from app.services.wallet import get_or_create_wallet


router = APIRouter(
    prefix="/api/wallet",
    tags=["Wallet"],
)


@router.get(
    "",
    response_model=WalletResponse,
)
def get_wallet(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wallet = get_or_create_wallet(
        db=db,
        user_id=current_user.id,
    )

    db.commit()
    db.refresh(wallet)

    return wallet
