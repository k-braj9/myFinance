from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class GroupCreate(BaseModel):
    name: str
    subheading: str
    user_count: int


class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class ExpenseParticipantCreate(BaseModel):
    user_id: int
    percentage: float

class ExpenseCreate(BaseModel):
    name: str
    amount: float
    due_date: Optional[datetime] = None
    payer_id: int
    participants: list[ExpenseParticipantCreate]
    category: str = "Other"
    created_at: datetime | None = None

class IndividualExpenseCreate(BaseModel):
    name: str
    amount: float


class GroupMemberCreate(BaseModel):
    user_id: int
    group_id: int

class ExpenseParticipants(BaseModel):
    expense_id: int
    user_id: int


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None

class InviteRequest(BaseModel):
    email: str

class PaymentCreate(BaseModel):
    to_user_id: int
    amount: float
    due_date: Optional[datetime] = None
