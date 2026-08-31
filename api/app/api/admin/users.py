from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.admin import get_current_admin
from app.core.database import get_db
from app.models.bet import Bet
from app.models.transaction import Transaction
from app.models.user import User
from app.models.wallet import Wallet


router = APIRouter(
    prefix="/api/admin/users",
    tags=["Admin - Users"],
)


@router.get("")
def get_users(
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = db.query(User)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            (User.full_name.ilike(search_term))
            | (User.phone.ilike(search_term))
        )

    if status == "active":
        query = query.filter(User.is_active.is_(True))

    elif status == "inactive":
        query = query.filter(User.is_active.is_(False))

    users = (
        query
        .order_by(User.created_at.desc())
        .all()
    )

    result = []

    for user in users:
        wallet = (
            db.query(Wallet)
            .filter(Wallet.user_id == user.id)
            .first()
        )

        result.append({
            "id": user.id,
            "full_name": user.full_name,
            "phone": user.phone,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "wallet_balance": (
                float(wallet.balance)
                if wallet
                else 0.0
            ),
            "created_at": user.created_at,
            "updated_at": user.updated_at,
        })

    return result


@router.get("/{user_id}")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    user = db.get(User, user_id)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    wallet = (
        db.query(Wallet)
        .filter(Wallet.user_id == user.id)
        .first()
    )

    transaction_count = (
        db.query(Transaction)
        .filter(Transaction.user_id == user.id)
        .count()
    )

    bet_count = (
        db.query(Bet)
        .filter(Bet.user_id == user.id)
        .count()
    )

    return {
        "id": user.id,
        "full_name": user.full_name,
        "phone": user.phone,
        "is_active": user.is_active,
        "is_admin": user.is_admin,
        "wallet_balance": (
            float(wallet.balance)
            if wallet
            else 0.0
        ),
        "transaction_count": transaction_count,
        "bet_count": bet_count,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    }


@router.patch("/{user_id}/status")
def update_user_status(
    user_id: int,
    is_active: bool,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    user = db.get(User, user_id)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    if user.id == admin.id and not is_active:
        raise HTTPException(
            status_code=400,
            detail="You cannot deactivate your own administrator account.",
        )

    user.is_active = is_active

    db.commit()
    db.refresh(user)

    return {
        "message": (
            "User activated"
            if is_active
            else "User deactivated"
        ),
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "phone": user.phone,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
        },
    }


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    user = db.get(User, user_id)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    if user.id == admin.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own administrator account.",
        )

    if user.is_admin:
        raise HTTPException(
            status_code=400,
            detail="Administrator accounts cannot be deleted from this screen.",
        )

    # Delete dependent records first because the current
    # database foreign keys do not use ON DELETE CASCADE.
    db.query(Bet).filter(
        Bet.user_id == user.id
    ).delete(
        synchronize_session=False
    )

    db.query(Transaction).filter(
        Transaction.user_id == user.id
    ).delete(
        synchronize_session=False
    )

    db.query(Wallet).filter(
        Wallet.user_id == user.id
    ).delete(
        synchronize_session=False
    )

    db.delete(user)
    db.commit()

    return {
        "message": "User deleted successfully",
        "user_id": user_id,
    }
