from sqlalchemy import inspect

from app.core.database import Base, engine
from app.models.autotransact import Autotransact


def main():
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    if Autotransact.__tablename__ in tables:
        print("autotransacts table already exists.")
        return

    print("Creating autotransacts table...")

    Base.metadata.create_all(
        bind=engine,
        tables=[Autotransact.__table__],
    )

    print("autotransacts table created.")


if __name__ == "__main__":
    main()
