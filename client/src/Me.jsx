import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "./api/axios";
import './Me.css';

function Me() {
    const [me, setMe] = useState(null);
    const [groups, setGroups] = useState([]);
    const [expenses, setExpenses] = useState([])
    const [error, setError] = useState(null);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchMe = async () => {
            try {
                const res = await api.get("/me");
                setMe(res.data);
            } catch (error) {
                console.error(error);
                setError("Could not load profile.");
            }
        };

        fetchMe();
    }, []);

    useEffect(() => {
        if (!me) return;

        const fetchGroups = async () => {
            try {
                const res = await api.get(`/groups`);
                setGroups(res.data);
            } catch (error) {
                console.log("ERROR:", error);
            }
        };

        fetchGroups();
    }, [me]);

    useEffect(() => {
        if (!me) return;

        const fetchExpenses = async () => {
            try {
                const res = await api.get(`/users/${me.id}/expenses`);
                console.log("expenses:", res.data);
                setExpenses(res.data);
            } catch (error) {
                console.log("ERROR:", error);
            }
        };

        fetchExpenses();
    }, [me]);

    const totalPaid = expenses.reduce((sum, expense) => {
        if (expense.payer_id === me.id) {
            return sum + Number(expense.amount);
        }
        return sum;
    }, 0);

    function formatDueDate(dueDate) {
        const d = new Date(dueDate);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${month}-${day}-${year}`;
    }

    const recentActivity = [...expenses].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

    if (error) {
        return <p>{error}</p>;
    }

    if (!me) {
        return <p>Loading...</p>;
    }

    return (
        <div className="header_profile">
            <div className="left">
                <img src="profile.png" alt={`${me.username}'s profile`} />
                <h1>{me.username}</h1>
                <h1>{me.email}</h1>
                <h1>Total paid: ${totalPaid.toFixed(2)}</h1>
            </div>
            <div className="middle">
                <h1>Groups: </h1>
                {groups.length === 0 ? (
                    <p className="none">No groups created yet</p>
                ) : (
                    groups.map((group) => (
                        <div
                            key={group.id}
                            onClick={() => navigate(`/groups/${group.id}`)}
                            style={{ cursor: "pointer" }}
                            className="map"
                        >
                            <h2>{group.name}</h2>
                            <p>Capacity: {group.user_count}</p>
                            <button onClick= {() => navigate(`/groups/${group.id}`)} className = "group_view">View</button>
                        </div>
                    ))
                )}
            </div>
            <div className="right">
                <h1>Expenses: </h1>
                {expenses.map(expense => (
                    <div key={expense.id} className="expense">
                        <span>{expense.name}</span>
                        <span>${expense.amount}</span>
                        {expense.due_date && (
                            <span className="due-date">
                                Due: {formatDueDate(expense.due_date)}
                            </span>
                        )}
                        {expense.participants?.length > 1 && (
                            <div className="split-between">
                                Split between:{" "}
                                {expense.participants
                                    .map(participant => participant.username)
                                    .join(", ")
                                }
                            </div>
                        )}
                        <button onClick= {() => navigate(`/expenses/${expense.id}`)} className = "view">Edit</button>
                    </div>
                ))}
            </div>
            <div className="bottom">
                <h1>Recent Activity: </h1>
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
                                <span className="activity-amount">${Number(expense.amount).toFixed(2)}</span>
                                <span className="activity-date">
                                    {formatDueDate(expense.due_date)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Me;