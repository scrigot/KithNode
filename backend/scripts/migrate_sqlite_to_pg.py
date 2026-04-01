#!/usr/bin/env python3
"""Migrate data from SQLite (cold-outreach-bot) to PostgreSQL (KithNode).

Usage:
    DATABASE_URL=postgresql://... python scripts/migrate_sqlite_to_pg.py [path_to_sqlite.db]

If no path is provided, defaults to the cold-outreach-bot output DB.
"""

import json
import os
import sqlite3
import sys

import psycopg2
import psycopg2.extras

DEFAULT_SQLITE_PATH = os.path.expanduser(
    "~/cold-outreach-bot/output/outreach.db"
)

TABLES_IN_ORDER = [
    "companies",
    "contacts",
    "signals",
    "scores",
    "enrichments",
    "affiliations",
    "outreach",
]


def migrate(sqlite_path: str, pg_dsn: str):
    # Connect to both databases
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row

    pg_conn = psycopg2.connect(pg_dsn)
    pg_cursor = pg_conn.cursor()

    try:
        for table in TABLES_IN_ORDER:
            rows = sqlite_conn.execute(f"SELECT * FROM {table}").fetchall()
            if not rows:
                print(f"  {table}: 0 rows (skipped)")
                continue

            columns = rows[0].keys()
            # Exclude 'id' — let Postgres SERIAL assign new IDs
            cols_no_id = [c for c in columns if c != "id"]

            if not cols_no_id:
                print(f"  {table}: no columns to migrate (skipped)")
                continue

            placeholders = ", ".join(["%s"] * len(cols_no_id))
            col_names = ", ".join(cols_no_id)

            # Build conflict clause for upsert where possible
            conflict_col = None
            if table == "companies":
                conflict_col = "domain"

            if conflict_col:
                insert_sql = f"""
                    INSERT INTO {table} ({col_names})
                    VALUES ({placeholders})
                    ON CONFLICT ({conflict_col}) DO NOTHING
                """
            else:
                insert_sql = f"""
                    INSERT INTO {table} ({col_names})
                    VALUES ({placeholders})
                """

            count = 0
            for row in rows:
                values = tuple(row[c] for c in cols_no_id)
                try:
                    pg_cursor.execute(insert_sql, values)
                    count += 1
                except psycopg2.IntegrityError:
                    pg_conn.rollback()
                    continue

            pg_conn.commit()
            print(f"  {table}: {count}/{len(rows)} rows migrated")

        # Reset sequences to max(id) + 1
        for table in TABLES_IN_ORDER:
            pg_cursor.execute(f"""
                SELECT setval(pg_get_serial_sequence('{table}', 'id'),
                       COALESCE((SELECT MAX(id) FROM {table}), 0) + 1, false)
            """)
        pg_conn.commit()
        print("\n  Sequences reset. Migration complete.")

    finally:
        sqlite_conn.close()
        pg_cursor.close()
        pg_conn.close()


if __name__ == "__main__":
    pg_dsn = os.environ.get("DATABASE_URL")
    if not pg_dsn:
        print("Error: DATABASE_URL environment variable not set")
        sys.exit(1)

    sqlite_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SQLITE_PATH
    if not os.path.exists(sqlite_path):
        print(f"Error: SQLite database not found at {sqlite_path}")
        sys.exit(1)

    print(f"Migrating from {sqlite_path} to Postgres...")
    migrate(sqlite_path, pg_dsn)
