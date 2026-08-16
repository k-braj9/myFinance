import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "./api/axios";
import './Payments.css';

function Payments() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPayments = async () => {
            try {
                const res = await api.get("/payments");
                setPayments(res.data);
            } catch (error) {
                console.log(error);
            } finally {
                setLoading(false);
            }
        };
        fetchPayments();
    }, []);

    async function removePayment(paymentId) {
        try {
            await api.delete(`/payments/${paymentId}`);
            setPayments(payments.filter(payment => payment.id !== paymentId));
        } catch (error) {
            console.log(error);
        }
    }

    async function acceptPayment(paymentId) {
        try {
            await api.post(`/payments/${paymentId}/accept`);
            setPayments(payments.filter(payment => payment.id !== paymentId));
        }
        catch (error) {
            console.log(error);
        }
    }

    const totalOwed = payments.reduce((sum, p) => sum + p.amount, 0);

    const groupedPayments = payments.reduce((groups, payment) => {
        if (!groups[payment.group_name]) {
            groups[payment.group_name] = [];
        }

        groups[payment.group_name].push(payment);

        return groups;
    }, {});

    function formatDueDate(date) {
        if (!date) return "N/A";
        const d = new Date(date);
        if (isNaN(d.getTime())) return "N/A";
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const year = d.getFullYear();
        return `${month}-${day}-${year}`;
    }

    return (
        <div className="payments-page">
            <div className="payments-header">
                <div>
                    <h1 className="payments-title">Payments</h1>
                    <p className="notice">
                        Payments you need to make across your groups across other credit sites.
                    </p>
                </div>
                <div className="payments-summary">
                    <span>Total Payments</span>
                    <h2>${totalOwed.toFixed(2)}</h2>
                </div>
            </div>
            {loading ? (
                <p className="none">Loading...</p>
            ) : error ? (
                <p className="none">{error}</p>
            ) : payments.length === 0 ? (
                <p className="none">No payments have been recorded yet.</p>
            ) : (
                <div className="payments-list">
                    {Object.entries(groupedPayments).map(([groupName, groupPayments]) => (
                        <div key={groupName} className="group-payment">
                            <h2>{groupName}</h2>
                            {groupPayments.map((payment) => (
                                <div
                                    key={payment.id}
                                    className="payment-card"
                                >
                                    <div className="payment-top">
                                        <div>
                                            <h3>You owe {payment.payee_username}: </h3>
                                        </div>
                                        <span className="payment-value">
                                            ${Number(payment.amount).toFixed(2)}
                                        </span>
                                        <span className="payment-date">
                                            {formatDueDate(payment.created_at)}
                                        </span>
                                    </div>
                                    <div className="payment-bottom">
                                        <button
                                            onClick={() =>
                                                navigate(`/groups/${payment.group_id}`)
                                            }
                                        >
                                            View Group
                                        </button>

                                        <button
                                            className="delete"
                                            onClick={() => removePayment(payment.id)}
                                        >
                                            Delete
                                        </button>
                                        <button
                                            className="accept"
                                            onClick={() => acceptPayment(payment.id)}
                                        >
                                            Cash In
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Payments;