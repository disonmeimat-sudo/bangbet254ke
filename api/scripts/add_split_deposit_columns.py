from sqlalchemy import inspect, text

from app.core.database import engine


def main():
    inspector = inspect(engine)
    columns = {
        column["name"]
        for column in inspector.get_columns("transactions")
    }

    statements = []

    if "parent_transaction_id" not in columns:
        statements.append(
            """
            ALTER TABLE transactions
            ADD COLUMN parent_transaction_id INTEGER
            """
        )

    if "split_account" not in columns:
        statements.append(
            """
            ALTER TABLE transactions
            ADD COLUMN split_account INTEGER
            """
        )

    if not statements:
        print("Split-deposit columns already exist.")
        return

    with engine.begin() as conn:
        for statement in statements:
            print(statement.strip())
            conn.execute(text(statement))

    print("Split-deposit columns added.")


if __name__ == "__main__":
    main()
