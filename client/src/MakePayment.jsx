import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "./api/axios";
import './MakePayment.css';

function MakePayment() {
    const { groupId, toUserId } = useParams();
    const navigate = useNavigate();

    const [amount, setAmount] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [error, setError] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        try {
            await api.post(`/groups/${groupId}/settle`, {
                to_user_id: Number(toUserId),
                amount: Number(amount),
                due_date: dueDate || null
            });
            navigate(`/groups/${groupId}`);
        } catch (err) {
            setError("Failed to create payment.");
        }
    }

    return (
        <div>
            <h1 className="title">Write Payment</h1>
            <div className="payment_form">
                <form onSubmit={handleSubmit}>
                    <input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Amount"
                    />
                    {error && <p className="error">{error}</p>}
                    <button type="submit">Make Payment</button>
                </form>
            </div>
        </div>
    );
}

export default MakePayment;