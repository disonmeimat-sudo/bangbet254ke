from sqlalchemy import inspect, text

from app.core.database import engine


def main():
    inspector = inspect(engine)
    columns = {
        column["name"]
        for column in inspector.get_columns("autotransacts")
    }

    if "fallback_attempted" not in columns:
        with engine.begin() as conn:
            conn.execute(
                text(
                    """
                    ALTER TABLE autotransacts
                    ADD COLUMN fallback_attempted BOOLEAN
                    NOT NULL DEFAULT FALSE
                    """
                )
            )

        print("Added autotransacts.fallback_attempted")
    else:
        print("autotransacts.fallback_attempted already exists")


if __name__ == "__main__":
    main()
