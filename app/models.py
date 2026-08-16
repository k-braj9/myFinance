from sqlalchemy import Column, Integer, String, ForeignKey, Float, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base, engine


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False)

    subheading = Column(String, nullable = False)
    
    user_count = Column(Integer)

    owner_id = Column(Integer, ForeignKey("users.id"))

    pending_invites = relationship("Invite", back_populates="group")

    owner = relationship("User", back_populates="owned_groups")

    members = relationship("User", secondary="group_members", back_populates="groups")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    username = Column(String, unique=True)

    email = Column(String, unique=True)

    hashed_password = Column(String, nullable=False)

    groups = relationship("Group", secondary="group_members", back_populates="members")

    owned_groups = relationship("Group", back_populates="owner")

    invites = relationship("Invite", back_populates="invitee")


class Expenses(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String)

    amount = Column(Integer)

    group_id = Column(Integer)

    payer_id = Column(Integer, ForeignKey("users.id"))

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    due_date = Column(DateTime(timezone=True), nullable=True)

    category = Column(String, nullable=False, default="Other")



class GroupMembers(Base):
    __tablename__ = "group_members"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"))

    group_id = Column(Integer, ForeignKey("groups.id"))

class ExpenseParticipants(Base):
    __tablename__ = "expense_participants"

    id = Column(Integer, primary_key=True)

    expense_id = Column(
        Integer,
        ForeignKey("expenses.id")
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id")
    )

    percentage = Column(Float, nullable=False)

class Invite(Base):
    __tablename__ = "invites"

    id = Column(Integer, primary_key=True, index=True)

    invitee_id = Column(Integer, ForeignKey("users.id"))

    group_id = Column(Integer, ForeignKey("groups.id"))

    status = Column(String, default="pending")

    invitee = relationship("User", back_populates="invites")

    group = relationship("Group", back_populates="pending_invites")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)

    group_id = Column(Integer, ForeignKey("groups.id"))

    payer_id = Column(Integer, ForeignKey("users.id"))

    payee_id = Column(Integer, ForeignKey("users.id"))

    amount = Column(Float, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    due_date = Column(DateTime(timezone=True), nullable=True)

    status = Column(String, default="pending")