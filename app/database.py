import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

print("LENGTH:", len(DATABASE_URL) if DATABASE_URL else "MISSING")
if DATABASE_URL and "@" in DATABASE_URL:
    host_part = DATABASE_URL.split("@")[1].split("/")[0]
    print("HOST PART LENGTH:", len(host_part))
    print("HOST PART FIRST CHAR:", repr(host_part[0]) if host_part else "EMPTY")
else:
    print("NO @ FOUND IN URL")

engine = create_engine(DATABASE_URL)

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()