from fastapi import APIRouter, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.services.autotransact import process_due_autotransacts


router = APIRouter(
    prefix="/api/autotransact",
    tags=["Autotransact Processor"],
)


@router.post("/process")
def process_autotransact(
    authorization: str | None = Header(default=None),
):
    """
    Scheduled Autotransact processor.

    Vercel Cron should send:
        Authorization: Bearer <CRON_SECRET>

    No customer-facing authentication is accepted here.
    """

    if not settings.cron_secret:
        raise HTTPException(
            status_code=503,
            detail="Autotransact processor secret is not configured.",
        )

    expected = f"Bearer {settings.cron_secret}"

    if authorization != expected:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized.",
        )

    db: Session = SessionLocal()

    try:
        return process_due_autotransacts(
            db=db,
            limit=20,
        )
    finally:
        db.close()
