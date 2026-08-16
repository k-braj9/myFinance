import os
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional
from passlib.context import CryptContext
from jose import JWTError, jwt
from sqlalchemy import func
from datetime import datetime, timedelta, timezone
from app.database import engine, get_db, Base
from app.models import User, Group, Expenses, GroupMembers, ExpenseParticipants, Invite, Payment
from app.schemas import GroupCreate, UserCreate, ExpenseCreate, GroupMemberCreate, TokenData, Token, InviteRequest, IndividualExpenseCreate, PaymentCreate
from fastapi.middleware.cors import CORSMiddleware
from collections import Counter


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Security Configs
SECRET_KEY = os.getenv("SECRET_KEY") or "development_secret"
ALGORITHM = "HS256"
TOKEN_EXPIRES = 30
pwd_context = CryptContext(
    schemes=['bcrypt'],
    deprecated="auto"
)
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="token"
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def pwd_hash(password: str) -> str:
    return pwd_context.hash(password)

def pwd_verify(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):

    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta

    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)

    to_encode.update({
        "exp": expire
    })

    encoded_jwt = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return encoded_jwt


def verify_token(token: str):
    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        email: str = payload.get("sub")

        if email is None:

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not verify credentials",
                headers={"WWW-Authenticate": "Bearer"}
            )

        return TokenData(email=email)

    except JWTError:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not verify credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )


# Create
Base.metadata.create_all(bind=engine)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):

    token_data = verify_token(token)

    user = db.query(User).filter(
        User.email == token_data.email
    ).first()

    if user is None:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User does not exist",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return user



@app.post("/token", response_model=Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):

    user = db.query(User).filter(
        User.username == form_data.username
    ).first()

    print("LOGIN USERNAME:", form_data.username)
    print("FOUND USER:", user)

    if not user:
        print("USER NOT FOUND")
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )
    if not pwd_verify(
        form_data.password,
        user.hashed_password
    ):
        print("PASSWORD CHECK FAILED")
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )

    access_token_expires = timedelta(
        minutes=TOKEN_EXPIRES
    )

    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# Endpoints

@app.post("/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)):

    existing_user = db.query(User).filter(
    (User.username == user.username) |
    (User.email == user.email)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="User already exists!"
        )
    hashed_password = pwd_hash(user.password)

    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )

    db.add(db_user)

    db.commit()

    db.refresh(db_user)

    return {
        "message": "User created successfully"
    }


@app.get("/me")
def get_me(
    current_user: User = Depends(get_current_user)
):

    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email
    }










@app.get("/")
def root():
    return {"message": "Expense Splitter API"}


@app.post("/groups")
def create_group(
    group: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        new_group = Group(
            name=group.name,
            user_count=group.user_count,
            subheading=group.subheading,
            owner_id=current_user.id
        )
        db.add(new_group)
        db.flush()
        
        new_member = GroupMembers(
            user_id=current_user.id,
            group_id=new_group.id
        )
        db.add(new_member)

        db.commit()
        db.refresh(new_group)

        return new_group

    except Exception as e:
        print("🔥 GROUP CREATE ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/groups")
def get_groups(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):

    groups = db.query(Group).all()
    return db.query(Group).filter(
        (Group.owner_id == current_user.id) |
        (Group.members.any(id=current_user.id))
    ).all()


@app.get("/groups/{group_id}")
def get_group(group_id: int, db: Session = Depends(get_db)):

    group = db.query(Group).filter(
        Group.id == group_id
    ).first()

    return group


@app.put("/groups/{group_id}")
def update_group(
    group_id: int,
    group: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    db_group = db.query(Group).filter(
        Group.id == group_id
    ).first()

    db_group.name = group.name

    db_group.user_count = group.user_count

    db.commit()

    return {
        "message": "Group updated"
    }


@app.delete("/groups/{group_id}")
def delete_group(group_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # delete dependents first
    db.query(Payment).filter(Payment.group_id == group_id).delete()
    db.query(Expenses).filter(Expenses.group_id == group_id).delete()
    db.query(GroupMembers).filter(GroupMembers.group_id == group_id).delete()
    # add any other tables that reference group_id

    db.delete(group)
    db.commit()
    return {"detail": "Group deleted"}

@app.get("/users/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):

    user = db.query(User).filter(
        User.id == user_id
    ).first()
    return user

@app.post("/expenses/create")
def create_individual_expense(
    expense: IndividualExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_expense = Expenses(
        name=expense.name,
        amount=expense.amount,
        payer_id=current_user.id,
    )

    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)

    return {
        "message": f"Expense {expense.name} created",
        "expense_id": new_expense.id
    }

@app.post("/groups/{group_id}/expenses")
def create_expense(
    group_id: int,
    expense: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Make sure the payer belongs to the group
    payer_membership = db.query(GroupMembers).filter(
        GroupMembers.group_id == group_id,
        GroupMembers.user_id == expense.payer_id
    ).first()

    if not payer_membership:
        raise HTTPException(
            status_code=400,
            detail="Payer is not a member of this group"
        )

    # Make sure there is at least one participant
    if not expense.participants:
        raise HTTPException(
            status_code=400,
            detail="At least one participant is required"
        )

    # Make sure percentages are valid
    for participant in expense.participants:
        if participant.percentage < 0 or participant.percentage > 100:
            raise HTTPException(
                status_code=400,
                detail="Participant percentages must be between 0 and 100"
            )

    # Make sure percentages add up to exactly 100%
    total_percentage = sum(
        participant.percentage
        for participant in expense.participants
    )

    if abs(total_percentage - 100) > 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"Participant percentages must add up to 100%. Current total: {total_percentage}%"
        )

    # Remove duplicate participants while preserving order
    seen_users = set()
    unique_participants = []

    for participant in expense.participants:
        if participant.user_id not in seen_users:
            seen_users.add(participant.user_id)
            unique_participants.append(participant)

    if not unique_participants:
        raise HTTPException(
            status_code=400,
            detail="At least one participant is required"
        )

    # Make sure every participant belongs to the group
    for participant in unique_participants:
        participant_membership = db.query(GroupMembers).filter(
            GroupMembers.group_id == group_id,
            GroupMembers.user_id == participant.user_id
        ).first()

        if not participant_membership:
            raise HTTPException(
                status_code=400,
                detail=f"User {participant.user_id} is not a member of this group"
            )

    # Create the expense
    new_expense = Expenses(
        name=expense.name,
        amount=expense.amount,
        due_date=expense.due_date,
        group_id=group_id,
        payer_id=expense.payer_id,
        category=expense.category
    )

    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)

    # Create participant records with percentages
    for participant in unique_participants:
        db.add(
            ExpenseParticipants(
                expense_id=new_expense.id,
                user_id=participant.user_id,
                percentage=participant.percentage
            )
        )

    db.commit()

    # Debug output
    saved_participants = db.query(ExpenseParticipants).filter(
        ExpenseParticipants.expense_id == new_expense.id
    ).all()

    print(
        "SAVED PARTICIPANTS:",
        [
            {
                "user_id": p.user_id,
                "percentage": p.percentage
            }
            for p in saved_participants
        ]
    )

    return {
        "message": f"Expense {expense.name} created for group id: {group_id}",
        "expense_id": new_expense.id
    }




@app.get("/groups/{group_id}/expenses")
def get_group_expenses(
    group_id: int,
    db: Session = Depends(get_db)
):
    expenses = db.query(Expenses).filter(
        Expenses.group_id == group_id
    ).all()

    result = []

    for expense in expenses:

        participants = db.query(ExpenseParticipants).filter(
            ExpenseParticipants.expense_id == expense.id
        ).all()

        payer = db.query(User).filter(
            User.id == expense.payer_id
        ).first()

        participant_data = []

        for p in participants:
            user = db.query(User).filter(
                User.id == p.user_id
            ).first()

            participant_data.append({
                "user_id": p.user_id,
                "username": user.username if user else "Unknown",
                "percentage": p.percentage,
                "share": expense.amount * (p.percentage / 100)
            })

        result.append({
            "id": expense.id,
            "name": expense.name,
            "amount": expense.amount,
            "created_at": expense.created_at,
            "due_date": expense.due_date,
            "group_id": expense.group_id,
            "payer_id": expense.payer_id,
            "payer_username": payer.username if payer else "Unknown",
            "category": expense.category,
            "participants": participant_data
        })

    return result


@app.get("/expenses")
def get_expenses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expenses = (
        db.query(Expenses)
        .filter(
            or_(
                Expenses.paid_by_id == current_user.id,
                Expenses.participants.any(id=current_user.id)
            )
        )
        .all()
    )
    return expenses

@app.delete("/groups/{group_id}/expenses/{expense_id}")
def delete_expense(
    group_id: int,
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expense = db.query(Expenses).filter(
        Expenses.id == expense_id,
        Expenses.group_id == group_id
    ).first()

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    db.query(ExpenseParticipants).filter(
        ExpenseParticipants.expense_id == expense_id
    ).delete()

    db.delete(expense)
    db.commit()

    return {"message": "Expense deleted"}


@app.post("/group-members")
def add_user_to_group(
    member: GroupMemberCreate,
    db: Session = Depends(get_db),
):

    new_member = GroupMembers(
        user_id=member.user_id,
        group_id=member.group_id
    )

    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return {
        "message": "User added to group {group_id}"
    }


@app.get("/groups/{group_id}/members")
def get_group_members(
    group_id: int,
    db: Session = Depends(get_db),
):
    members = (
        db.query(GroupMembers, User.username)
        .join(User, GroupMembers.user_id == User.id)
        .filter(GroupMembers.group_id == group_id)
        .all()
    )

    result = [
        {
            "id": member.id,
            "group_id": member.group_id,
            "user_id": member.user_id,
            "username": username,
        }
        for member, username in members
    ]

    return result

@app.get("/groups/{group_id}/balances")
def calculate_balances(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    group_expenses = db.query(Expenses).filter(
        Expenses.group_id == group_id
    ).all()

    balances = {}

    for expense in group_expenses:

        raw_participants = db.query(ExpenseParticipants).filter(
            ExpenseParticipants.expense_id == expense.id
        ).all()

        participants = dedupe_participants(raw_participants)

        if not participants:
            continue

        payer = expense.payer_id

        # The payer initially gets credit for paying
        balances[payer] = balances.get(payer, 0) + expense.amount

        # Each participant gets charged according
        # to their individual percentage
        for participant in participants:

            user_id = participant.user_id

            share = expense.amount * (
                participant.percentage / 100
            )

            balances[user_id] = balances.get(user_id, 0) - share

    # Apply payments/settlements
    group_payments = db.query(Payment).filter(
        Payment.group_id == group_id
    ).all()

    for payment in group_payments:

        balances[payment.payer_id] = (
            balances.get(payment.payer_id, 0)
            + payment.amount
        )

        balances[payment.payee_id] = (
            balances.get(payment.payee_id, 0)
            - payment.amount
        )

    return balances


def dedupe_participants(participants):
    seen = set()
    result = []
    for p in participants:
        if p.user_id in seen:
            continue
        seen.add(p.user_id)
        result.append(p)
    return result

@app.post("/groups/{group_id}/invite")
def send_invite(
    group_id: int,
    payload: InviteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    email = payload.email

    group = db.query(Group).filter(
        Group.id == group_id
    ).first()


    if not group:
        raise HTTPException(
            status_code=404,
            detail="Group not found"
        )


    if group.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Only owner can invite"
        )


    user = db.query(User).filter(
        User.email == email
    ).first()


    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )


    existing = db.query(Invite).filter(
        Invite.group_id == group_id,
        Invite.invitee_id == user.id,
        Invite.status == "pending"
    ).first()


    if existing:
        raise HTTPException(
            status_code=400,
            detail="Invite already sent"
        )


    invite = Invite(
        invitee_id=user.id,
        group_id=group_id
    )

    db.add(invite)
    db.commit()


    return {
        "message": "Invite sent"
    }

@app.get("/invites")
def get_invites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invites = (
        db.query(
            Invite,
            Group.name.label("group_name"),
            User.username.label("sender_name")
        )
        .join(Group, Invite.group_id == Group.id)
        .join(User, Group.owner_id == User.id)
        .filter(
            Invite.invitee_id == current_user.id,
            Invite.status == "pending"
        )
        .all()
    )

    return [
        {
            "id": invite.id,
            "group_id": invite.group_id,
            "group_name": group_name,
            "sender_name": sender_name
        }
        for invite, group_name, sender_name in invites
    ]


@app.post("/invites/{invite_id}/accept")
def accept_invites(invite_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    invite = db.query(Invite).filter(
        Invite.id == invite_id
    ).first()

    if not invite:
        raise HTTPException(
            status_code=404,
            detail="Invite not found"
        )

    if invite.invitee_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not your invite"
        )

    group = invite.group

    db.add(GroupMembers(user_id=current_user.id, group_id=group.id))

    db.delete(invite)
    db.commit()

    return {
        "message": "Joined group"
    }

@app.delete("/{invite_id}")
def reject_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    invite = db.query(Invite).filter(
        Invite.id == invite_id
    ).first()


    if invite.invitee_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not your invite"
        )


    db.delete(invite)
    db.commit()

    return {
        "message": "Invite rejected"
    }

@app.delete("/groups/{group_id}/members/{user_id}")
def remove_member(
    group_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    member = db.query(GroupMembers).filter(
        GroupMembers.user_id == user_id,
        GroupMembers.group_id == group_id
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    db.delete(member)
    db.commit()

    return {"message": f"Member {user_id} deleted"}

@app.get("/users/{user_id}/expenses")
def get_user_expenses(user_id: int, db: Session = Depends(get_db)):
    expenses = db.query(Expenses).filter(Expenses.payer_id == user_id).all()

    result = []
    for expense in expenses:
        participants = db.query(ExpenseParticipants).filter(
            ExpenseParticipants.expense_id == expense.id
        ).all()

        result.append({
            "id": expense.id,
            "name": expense.name,
            "amount": expense.amount,
            "due_date": expense.due_date,
            "group_id": expense.group_id,
            "payer_id": expense.payer_id,
            "participants": [
                {
                    "user_id": p.user_id,
                    "username": db.query(User).filter(User.id == p.user_id).first().username
                }
                for p in participants
            ]
        })

    return result

@app.delete("/expenses/{expense_id}")
def delete_expense_flat(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expense = db.query(Expenses).filter(Expenses.id == expense_id).first()

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    if expense.payer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this expense")

    # clean up participant rows first to avoid orphaned FK rows
    db.query(ExpenseParticipants).filter(
        ExpenseParticipants.expense_id == expense.id
    ).delete()

    db.delete(expense)
    db.commit()

    return {"message": f"Expense {expense_id} deleted"}


@app.put("/expenses/{expense_id}")
def update_expense(
    expense_id: int,
    expense_update: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expense = db.query(Expenses).filter(Expenses.id == expense_id).first()

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    if expense.payer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this expense")

    payer_membership = db.query(GroupMembers).filter(
        GroupMembers.group_id == expense.group_id,
        GroupMembers.user_id == expense_update.payer_id
    ).first()

    if not payer_membership:
        raise HTTPException(status_code=400, detail="Payer is not a member of this group")

    if not expense_update.participant_ids:
        raise HTTPException(status_code=400, detail="At least one participant is required")

    # dedupe while preserving order
    unique_participant_ids = list(dict.fromkeys(expense_update.participant_ids))

    for user_id in unique_participant_ids:
        membership = db.query(GroupMembers).filter(
            GroupMembers.group_id == expense.group_id,
            GroupMembers.user_id == user_id
        ).first()
        if not membership:
            raise HTTPException(
                status_code=400,
                detail=f"User {user_id} is not a member of this group"
            )

    expense.name = expense_update.name
    expense.amount = expense_update.amount
    expense.payer_id = expense_update.payer_id
    db.commit()

    # replace participants
    db.query(ExpenseParticipants).filter(
        ExpenseParticipants.expense_id == expense.id
    ).delete()

    for user_id in unique_participant_ids:
        db.add(ExpenseParticipants(
            expense_id=expense.id,
            user_id=user_id
        ))

    db.commit()

    return {"message": f"Expense {expense.id} updated"}

@app.delete("/groups/{group_id}/leave")
def leave_group(group_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    membership = db.query(GroupMembers).filter(
        GroupMembers.group_id == group_id,
        GroupMembers.user_id == current_user.id
    ).first()

    if not membership:
        raise HTTPException(status_code=404, detail="You are not a member of this group")

    db.delete(membership)
    db.commit()

    return {"detail": "Left group"}

def compute_group_settlements(group_id: int, db: Session):

    group_expenses = db.query(Expenses).filter(
        Expenses.group_id == group_id
    ).all()

    balances = {}

    # Calculate balances using percentage splits
    for expense in group_expenses:

        raw_participants = db.query(ExpenseParticipants).filter(
            ExpenseParticipants.expense_id == expense.id
        ).all()

        participants = dedupe_participants(raw_participants)

        if not participants:
            continue

        payer = expense.payer_id

        # Payer gets credit for the full amount they paid
        balances[payer] = (
            balances.get(payer, 0) + expense.amount
        )

        # Subtract each participant's percentage share
        for participant in participants:

            share = expense.amount * (
                participant.percentage / 100
            )

            balances[participant.user_id] = (
                balances.get(participant.user_id, 0) - share
            )

    # Apply payments that have already been made
    group_payments = db.query(Payment).filter(
        Payment.group_id == group_id
    ).all()

    for payment in group_payments:

        balances[payment.payer_id] = (
            balances.get(payment.payer_id, 0)
            + payment.amount
        )

        balances[payment.payee_id] = (
            balances.get(payment.payee_id, 0)
            - payment.amount
        )

    # Round balances to avoid floating point issues
    balances = {
        user_id: round(balance, 2)
        for user_id, balance in balances.items()
    }

    # Positive balances = people who are owed money
    creditors = []

    # Negative balances = people who owe money
    debtors = []

    for user_id, balance in balances.items():

        if balance > 0.01:
            creditors.append({
                "user_id": user_id,
                "amount": balance
            })

        elif balance < -0.01:
            debtors.append({
                "user_id": user_id,
                "amount": abs(balance)
            })

    # Match debtors with creditors
    settlements = []

    for debtor in debtors:

        for creditor in creditors:

            if debtor["amount"] <= 0:
                break

            if creditor["amount"] <= 0:
                continue

            payment_amount = min(
                debtor["amount"],
                creditor["amount"]
            )

            payment_amount = round(payment_amount, 2)

            settlements.append({
                "from": debtor["user_id"],
                "to": creditor["user_id"],
                "amount": payment_amount
            })

            debtor["amount"] = round(
                debtor["amount"] - payment_amount,
                2
            )

            creditor["amount"] = round(
                creditor["amount"] - payment_amount,
                2
            )

    return settlements


@app.get("/groups/{group_id}/settlements")
def calculate_settlements(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return compute_group_settlements(group_id, db)




@app.get("/payments")
def get_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    payments = db.query(Payment).filter(
        Payment.payer_id == current_user.id
    ).all()

    result = []

    for payment in payments:
        payer = db.query(User).filter(User.id == payment.payer_id).first()
        payee = db.query(User).filter(User.id == payment.payee_id).first()
        group = db.query(Group).filter(Group.id == payment.group_id).first()

        result.append({
            "id": payment.id,
            "group_id": payment.group_id,
            "group_name": group.name,
            "payer_id": payment.payer_id,
            "payer_username": payer.username,
            "payee_id": payment.payee_id,
            "payee_username": payee.username,
            "amount": payment.amount,
            "due_date": payment.due_date,
            "created_at": payment.created_at,
        })

    return result

@app.get("/users")
def get_users(db: Session = Depends(get_db)):
    return db.query(User).all()

@app.get("/groups")
def get_groups(db: Session = Depends(get_db)):
    return db.query(Group).all()

@app.post("/groups/{group_id}/settle")
def settle_payment(
    group_id: int,
    payment: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_payment = Payment(
        group_id=group_id,
        payer_id=current_user.id,
        payee_id=payment.to_user_id,
        amount=payment.amount
    )

    db.add(new_payment)
    db.commit()
    db.refresh(new_payment)

    return new_payment

@app.get("/expenses/{expense_id}")
def get_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expense = db.query(Expenses).filter(Expenses.id == expense_id).first()
 
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
 
    raw_participants = db.query(ExpenseParticipants).filter(
        ExpenseParticipants.expense_id == expense.id
    ).all()
    participants = dedupe_participants(raw_participants)
 
    return {
        "id": expense.id,
        "name": expense.name,
        "amount": expense.amount,
        "due_date": expense.due_date,
        "group_id": expense.group_id,
        "payer_id": expense.payer_id,
        "participants": [
            {
                "user_id": p.user_id,
                "username": db.query(User).filter(User.id == p.user_id).first().username
            }
            for p in participants
        ]
    }

@app.delete("/payments/{payment_id}")
def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()

    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.payer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    db.delete(payment)
    db.commit()

    return {"message": "Payment deleted successfully"}

@app.post("/payments/{payment_id}/accept")
def accept_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()

    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.payer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if payment.status == "settled":
        raise HTTPException(status_code=400, detail="Payment already settled")

    payment.status = "settled"
    db.commit()

    return {"message": "Payment marked as settled"}

@app.get("/dashboard")
def get_dashboard(
    month: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    groups = db.query(GroupMembers).filter(
        GroupMembers.user_id == current_user.id
    ).all()

    group_ids = [m.group_id for m in groups]

    groups = db.query(Group).filter(
        Group.id.in_(group_ids)
    ).all()

    # Expenses created by the user
    user_expenses = db.query(Expenses).filter(
        Expenses.payer_id == current_user.id
    ).all()

    # Payments the user owes
    outgoing_payments = db.query(Payment).filter(
        Payment.payer_id == current_user.id
    ).all()

    # Payments owed to the user
    incoming_payments = db.query(Payment).filter(
        Payment.payee_id == current_user.id
    ).all()

    # Use the requested month if provided, otherwise default to current month
    if month:
        try:
            target_year_str, target_month_str = month.split("-")
            target_year = int(target_year_str)
            target_month = int(target_month_str)
        except (ValueError, AttributeError):
            raise HTTPException(
                status_code=400,
                detail="Invalid month format, expected YYYY-MM"
            )
    else:
        target_year = datetime.now().year
        target_month = datetime.now().month

    monthly_categories = (
        db.query(
            Expenses.category,
            func.sum(Expenses.amount).label("total")
        )
        .filter(
            Expenses.payer_id == current_user.id,
            func.extract("month", Expenses.created_at) == target_month,
            func.extract("year", Expenses.created_at) == target_year
        )
        .group_by(Expenses.category)
        .all()
    )

    monthly_payments = []

    for category, total in monthly_categories:
        monthly_payments.append({
            "category": category,
            "amount": float(total)
        })

    # Recent expenses in user's groups
    recent_expenses = (
        db.query(Expenses)
        .filter(Expenses.group_id.in_(group_ids))
        .order_by(Expenses.created_at.desc())
        .limit(5)
        .all()
    )

    recent_activity = []

    for expense in recent_expenses:
        payer = db.query(User).filter(
            User.id == expense.payer_id
        ).first()

        group = db.query(Group).filter(
            Group.id == expense.group_id
        ).first()

        recent_activity.append({
            "expense_id": expense.id,
            "expense_name": expense.name,
            "amount": expense.amount,
            "group_name": group.name,
            "payer_username": payer.username,
            "created_at": expense.created_at,
        })
    group_counts = Counter()

    for expense in recent_expenses:
        group_counts[expense.group_id] += 1

    top_groups = []

    for group_id, count in group_counts.most_common(3):
        group = db.query(Group).filter(
            Group.id == group_id
        ).first()

        top_groups.append({
            "group_id": group.id,
            "group_name": group.name,
            "activity_count": count
        })

    return {
        "group_count": len(groups),

        "total_paid": sum(
            expense.amount for expense in user_expenses
        ),

        "total_you_owe": sum(
            payment.amount for payment in outgoing_payments
        ),

        "total_owed_to_you": sum(
            payment.amount for payment in incoming_payments
        ),

        "recent_activity": recent_activity,

        "top_groups": top_groups,

        "monthly_payments": monthly_payments
    }


@app.get("/dashboard/months")
def get_dashboard_months(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    groups = db.query(GroupMembers).filter(
        GroupMembers.user_id == current_user.id
    ).all()

    group_ids = [m.group_id for m in groups]

    if not group_ids:
        return {"months": []}

    year_expr = func.extract("year", Expenses.created_at)
    month_expr = func.extract("month", Expenses.created_at)

    rows = (
        db.query(year_expr.label("year"), month_expr.label("month"))
        .filter(Expenses.group_id.in_(group_ids))
        .distinct()
        .order_by(year_expr.desc(), month_expr.desc())
        .all()
    )

    months = [f"{int(year)}-{int(month):02d}" for year, month in rows]

    return {"months": months}