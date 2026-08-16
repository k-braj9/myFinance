import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "./api/axios";
import "./ExpenseDetail.css";

function ExpenseDetail() {
    const { id } = useParams();
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState("");
    const [payerId, setPayerId] = useState("");
    const [participantIds, setParticipantIds] = useState([]);
    const [members, setMembers] = useState([]);
    const [error, setError] = useState("");

    const navigate = useNavigate();

    useEffect(() => {
        const fetchExpense = async () => {
            try {
                const response = await api.get(`/expenses/${id}`);
                const expense = response.data;

                setName(expense.name);
                setAmount(expense.amount);
                setPayerId(Number(expense.payer_id));

                // trim a full timestamp down to YYYY-MM-DD for the date input
                setDate(expense.due_date ? expense.due_date.slice(0, 10) : "");

                setParticipantIds(
                    expense.participants.map(p => p.user_id)
                );

                // fetch members the same way the create form does
                const membersResponse = await api.get(
                    `/groups/${expense.group_id}/members`
                );
                setMembers(membersResponse.data);
            } catch (error) {
                console.log(error);
                setError("Failed to load expense details.");
            }
        };
        fetchExpense();
    }, [id]);

    async function handleSubmit(e) {
        e.preventDefault();

        setError("");

        if (!payerId) {
            setError("Choose who paid.");
            return;
        }

        if (participantIds.length === 0) {
            setError("Choose at least one participant.");
            return;
        }

        try {
            await api.put(`/expenses/${id}`, {
                name,
                amount: Number(amount),
                due_date: date,
                payer_id: payerId,
                participant_ids: participantIds
            });

            navigate(-1);
        } catch (error) {
            console.log(error);

            const detail = error.response?.data?.detail;

            const message = Array.isArray(detail)
                ? detail.map(d => d.msg).join(", ")
                : (detail || "Failed to update expense");

            setError(message);
        }
    }

    return (
        <div className="expense_form">
            <form onSubmit={handleSubmit}>
                <label>Name:</label>
                <input
                    type="text"
                    value={name}
                    placeholder="Expense Name"
                    onChange={(e) => setName(e.target.value)}
                />
                <label>Amount:</label>
                <input
                    type="number"
                    value={amount}
                    placeholder="Amount"
                    onChange={(e) => setAmount(e.target.value)}
                />
                <label>
                    Paid By

                    <select
                        value={payerId}
                        onChange={(e) =>
                            setPayerId(Number(e.target.value))
                        }
                    >
                        {members.map(member => (
                            <option
                                key={member.user_id}
                                value={member.user_id}
                            >
                                {member.username}
                            </option>
                        ))}
                    </select>

                </label>

                <h3>Split Between</h3>

                {members.map(member => (
                    <label key={member.user_id}>

                        <input
                            type="checkbox"
                            checked={participantIds.includes(member.user_id)}
                            onChange={(e) => {

                                if (e.target.checked) {

                                    setParticipantIds([
                                        ...participantIds,
                                        member.user_id
                                    ]);

                                } else {

                                    setParticipantIds(
                                        participantIds.filter(
                                            id => id !== member.user_id
                                        )
                                    );

                                }

                            }}
                        />

                        {member.username}

                    </label>
                ))}

                {error && (
                    <p className="error">
                        {error}
                    </p>
                )}

                <button type="submit">
                    Save Changes
                </button>

            </form>
        </div>
    );
}

export default ExpenseDetail;
