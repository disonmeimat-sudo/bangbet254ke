from sqlalchemy import inspect, text

from app.core.database import engine


def main():
    inspector = inspect(engine)

    columns = {
        column["name"]
        for column in inspector.get_columns("autotransacts")
    }

    if "current_cycle_reference" in columns:
        print("current_cycle_reference already exists.")
        return

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                ALTER TABLE autotransacts
                ADD COLUMN current_cycle_reference VARCHAR(100)
                """
            )
        )

        conn.execute(
            text(
                """
                CREATE UNIQUE INDEX
                IF NOT EXISTS ix_autotransacts_current_cycle_reference
                ON autotransacts (current_cycle_reference)
                """
            )
        )

    print("current_cycle_reference added.")


if __name__ == "__main__":
    main()
