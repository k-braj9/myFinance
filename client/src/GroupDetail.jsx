import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "./api/axios";
import Expense from "./Expense";
import './GroupDetail.css';

function GroupDetail() {
    const { id } = useParams();
    const [group, setGroup] = useState(null);
    const [balance, setBalance] = useState({});
    const [inviteEmail, setInviteEmail] = useState("");
    const [showInvite, setShowInvite] = useState(false);
    const [members, setMembers] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [settlements, setSettlements] = useState([]);
    const [settlingDebt, setSettlingDebt] = useState(null);
    const [settleAmount, setSettleAmount] = useState("");

    const navigate = useNavigate();

    useEffect(() => {
        fetchBalances();
    }, [id]);

    useEffect(() => {
        const fetchMe = async () => {
            try {
                const meRes = await api.get("/me");
                setCurrentUser(meRes.data);
            } catch (error) {
                console.log(error);
            }
        };
        fetchMe();
    }, []);

    useEffect(() => {
        const fetchExpenses = async () => {
            try {
                const expensesRes = await api.get(`/groups/${id}/expenses`);
                setExpenses(expensesRes.data);
            } catch (error) {
                console.log(error);
            }
        };

        fetchExpenses();
    }, [id]);

    useEffect(() => {
        fetchSettlements();
    }, [id]);

    async function fetchSettlements() {
        try {
            const res = await api.get(`/groups/${id}/settlements`);
            setSettlements(res.data);
        } catch (error) {
            console.log(error);
        }
    }

    useEffect(() => {
        const fetchGroup = async () => {
            try {
                const groupRes = await api.get(`/groups/${id}`);
                setGroup(groupRes.data);
                const membersRes = await api.get(`/groups/${id}/members`);
                setMembers(membersRes.data);
            } catch (error) {
                console.log(error);
            }
        };

        fetchGroup();
    }, [id]);

    async function sendInvite() {
        try {
            await api.post(`/groups/${id}/invite`, { email: inviteEmail });
            setInviteEmail("");
            alert("Invite sent");
        } catch (error) {
            console.log(error);
        }
    }

    async function settleUp(toUserId, amount) {
        try {
            await api.post(`/groups/${id}/settle`, {
                to_user_id: toUserId,
                amount: Number(amount)
            });
            setSettlingDebt(null);
            setSettleAmount("");
            await fetchBalances();
            await fetchSettlements();
        } catch (error) {
            console.log(error);
            alert("Failed to settle up. Please try again.");
        }
    }

    async function removeMember(userId) {
        try {
            await api.delete(`/groups/${id}/members/${userId}`);
            setMembers(members.filter(member => member.user_id !== userId));
            await fetchBalances();
        } catch (error) {
            console.log(error);
        }
    }

    async function removeExpense(expenseId) {
        try {
            await api.delete(`/groups/${id}/expenses/${expenseId}`);
            setExpenses(expenses.filter(expense => expense.id !== expenseId));
            await fetchBalances();
            await fetchSettlements();
        } catch (error) {
            console.log(error);
        }
    }

    async function fetchBalances() {
        const response = await api.get(`/groups/${id}/balances`);
        setBalance(response.data);
    }

    function formatBalance(userId) {
        const amount = balance[userId];

        if (amount === undefined || amount === null) {
            return { text: "no expenses yet", className: "settled" };
        }
        if (amount > 0) {
            return { text: `is owed $${amount.toFixed(2)}`, className: "owed" };
        }
        if (amount < 0) {
            return { text: `owes $${Math.abs(amount).toFixed(2)}`, className: "owes" };
        }
        return { text: "settled up", className: "settled" };
    }

    function getTotalPaid(userId) {
        return expenses
            .filter(expense => expense.payer_id === userId)
            .reduce((total, expense) => total + expense.amount, 0);
    }

    function getOwedTo(userId) {
        return settlements
            .filter(s => String(s.from) === String(userId))
            .map(s => {
                const toMember = members.find(m => String(m.user_id) === String(s.to));
                return {
                    toUserId: s.to,
                    username: toMember ? toMember.username : "Unknown",
                    amount: s.amount
                };
            });
    }

    function formatDueDate(date) {
        if (!date) return "N/A";
        const d = new Date(date);
        if (isNaN(d.getTime())) return "N/A";
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const year = d.getFullYear();
        return `${month}-${day}-${year}`;
    }

    function getTotalShare(userId) {
        let total = 0;

        for (let i = 0; i < expenses.length; i++) {
            const expense = expenses[i];
            const shares = getSplitShares(expense);

            for (let j = 0; j < shares.length; j++) {
                if (shares[j].user_id === userId) {
                    total = total + shares[j].share;
                }
            }
        }

        return total;
    }

    function getPayerName(expense) {
        const payer = members.find(member => member.user_id === expense.payer_id);
        return payer ? payer.username : "Unknown";
    }

    function getCategoryLabel(value) {
        switch (value) {
            case "food": return "Food & Dining";
            case "travel": return "Travel";
            case "utilities": return "Utilities";
            case "entertainment": return "Entertainment";
            case "shopping": return "Shopping";
            default: return "Other";
        }
    }
    function getCategoryIcon(value) {
        switch (value) {
            case "food": return "ti-tools-kitchen-2";
            case "travel": return "ti-plane";
            case "utilities": return "ti-bolt";
            case "entertainment": return "ti-movie";
            case "shopping": return "ti-shopping-bag";
            default: return "ti-dots";
        }
    }

    function getSplitShares(expense) {
        const participants = expense.participants || [];
        return participants.map((participant) => ({
            user_id: participant.user_id,
            username: participant.username,
            percentage: Number(participant.percentage),
            share: Number(participant.share)
        }));
    }

    // Recent activity: most recently added expenses, same pattern as Me.jsx
    const recentActivity = [...expenses]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

    if (!group) {
        return <p>Loading...</p>;
    }

    return (
        <div className="detail">
            <div className="group-header">
                <div className="header-left">
                    <h1 className="title">{group.name}</h1>
                    <p className="description">{group.subheading}</p>
                </div>
                <div className="header-right">
                    <Link to={`/groups/${id}/expense`} className="expense_button">
                        Create Expense
                    </Link>
                    <button
                        className="leave"
                        onClick={async () => {
                            await api.delete(`/groups/${group.id}/leave`);
                            navigate("/groups");
                        }}
                    >
                        Leave Group
                    </button>
                </div>
            </div>

            <div className="summary-row">
                <div className="summary-card">
                    <span>Members</span>
                    <h2>{members.length}</h2>
                </div>

                <div className="summary-card">
                    <span>Total Expenses</span>
                    <h2>
                        $
                        {expenses
                            .reduce((sum, expense) => sum + expense.amount, 0)
                            .toFixed(2)}
                    </h2>
                </div>

                <div className="summary-card">
                    <span>Outstanding Payments</span>
                    <h2>{settlements.length}</h2>
                </div>
            </div>

            <div className="member-strip">
                {members.map(member => {
                    const balanceInfo = formatBalance(member.user_id);
                    const totalPaid = getTotalPaid(member.user_id);
                    const totalShare = getTotalShare(member.user_id);
                    const owedTo = getOwedTo(member.user_id);

                    return (
                        <div key={member.id} className="member-card">
                            <div className="member-header">
                                {member.username}

                                {currentUser?.id === group.owner_id && (
                                    <button
                                        className="remove"
                                        onClick={() => removeMember(member.user_id)}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>

                            <div className="member-stats">
                                <div>
                                    <small>Paid</small>
                                    <h4>${totalPaid.toFixed(2)}</h4>
                                </div>

                                <div>
                                    <small>Share</small>
                                    <h4>${totalShare.toFixed(2)}</h4>
                                </div>

                                <div>
                                    <small>Status</small>

                                    {owedTo.length > 0 ? (
                                        owedTo.map(debt => (
                                            <div key={debt.toUserId} className="owed-breakdown">
                                                <span>
                                                    Owes {debt.username}
                                                    <br />
                                                    <strong>${debt.amount.toFixed(2)}</strong>
                                                </span>

                                                {currentUser?.id === member.user_id && (
                                                    <button
                                                        onClick={() =>
                                                            navigate(`/groups/${id}/pay/${debt.toUserId}`)
                                                        }
                                                    >
                                                        Make Payment
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <span className={balanceInfo.className}>
                                            {balanceInfo.text}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="content-columns">
                <div className="left-column">
                    <h2>Expenses</h2>
                    {expenses.length === 0 ? (
                        <p className="none">No expenses currently</p>
                    ) : (
                        <div className="expense-list">
                            {expenses.map(expense => {
                                const shares = getSplitShares(expense);
                                return (
                                    <div key={expense.id} className="expense-card">
                                        <div className="expense-top">
                                            <div>
                                                <h3>
                                                    {expense.name}
                                                </h3>
                                                <span className="category_badge">
                                                    {getCategoryLabel(expense.category)}
                                                </span>
                                                <span className="expense-price">
                                                    ${expense.amount.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="expense-actions">
                                                <button onClick={() => navigate(`/expenses/${expense.id}`)}>
                                                    Edit
                                                </button>
                                                <button onClick={() => removeExpense(expense.id)}>
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                        <div className="expense-details">
                                            <p>
                                                <strong>Paid by:</strong> {getPayerName(expense)}
                                            </p>
                                            <p>
                                                <strong>Date Created:</strong> {formatDueDate(expense.created_at)}
                                            </p>
                                        </div>
                                        <div className="expense-split">
                                            <strong>Split Between</strong>
                                            <div className="split-list">
                                                {shares.map(participant => (
                                                    <div key={participant.user_id} className="split-person">
                                                        <span>{participant.username}: </span>
                                                        <span>${participant.share.toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                <div className="right-column">
                    <h2>Recent Activity</h2>
                    {recentActivity.length === 0 ? (
                        <p className="none">No recent activity</p>
                    ) : (
                        <div className="activity-timeline">
                            {recentActivity.map((expense, index) => (
                                <div
                                    key={expense.id}
                                    className="activity-item"
                                    style={{ animationDelay: `${index * 0.06}s` }}
                                >
                                    <span className="activity-dot"></span>
                                    <span className="activity-name">{expense.name}</span>
                                    <span className="activity-amount">
                                        ${Number(expense.amount).toFixed(2)}
                                    </span>
                                    <span className="activity-date">
                                        {formatDueDate(expense.created_at)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {currentUser?.id === group.owner_id && (
                <div className="invite-card">
                    <h2>Invite Member</h2>
                    <p>Invite another member to collaborate in this group.</p>

                    <div className="invite-row">
                        <input
                            type="email"
                            placeholder="Enter email address..."
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                        />
                        <button className="btn" onClick={sendInvite}>
                            Send Invite
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default GroupDetail;