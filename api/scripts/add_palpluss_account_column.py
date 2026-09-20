from sqlalchemy import inspect, text

from app.core.database import engine


def main():
    inspector = inspect(engine)

    columns = {
        column["name"]
        for column in inspector.get_columns("transactions")
    }

    if "palpluss_account" in columns:
        print("palpluss_account already exists.")
        return

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                ALTER TABLE transactions
                ADD COLUMN palpluss_account INTEGER
                """
            )
        )

    print("palpluss_account added.")


if __name__ == "__main__":
    main()
