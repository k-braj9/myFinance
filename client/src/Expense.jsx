import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "./api/axios";
import "./Expense.css";

function Expense() {
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [members, setMembers] = useState([]);
    const [payerId, setPayerId] = useState("");
    const [error, setError] = useState("");
    const [category, setCategory] = useState("Other");
    const [loading, setLoading] = useState(true);

    // percentage-based participant state
    const [participants, setParticipants] = useState([]);

    const { groupId } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        let isMounted = true;

        const fetchMembers = async () => {
            try {
                const membersRes = await api.get(`/groups/${groupId}/members`);
                const meRes = await api.get("/me");

                if (!isMounted) return;

                setMembers(membersRes.data);

                const isMember = membersRes.data.some(
                    (m) => m.user_id === meRes.data.id
                );

                if (isMember) {
                    setPayerId(meRes.data.id);
                    setParticipants([{ user_id: meRes.data.id, percentage: 0 }]);
                } else if (membersRes.data.length > 0) {
                    setPayerId(membersRes.data[0].user_id);
                    setParticipants([
                        { user_id: membersRes.data[0].user_id, percentage: 0 }
                    ]);
                }
            } catch (error) {
                console.log(error);
                if (isMounted) {
                    setError("Failed to load group members.");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchMembers();

        return () => {
            isMounted = false;
        };
    }, [groupId]);

    // Add/remove participant
    const handleParticipantToggle = (userId) => {
        setParticipants((prev) => {
            const exists = prev.some((participant) => participant.user_id === userId);

            if (exists) {
                return prev.filter((participant) => participant.user_id !== userId);
            }

            return [...prev, { user_id: userId, percentage: 0 }];
        });
    };

    // Change participant percentage
    const handlePercentageChange = (userId, value) => {
        setParticipants((prev) =>
            prev.map((participant) =>
                participant.user_id === userId
                    ? { ...participant, percentage: value }
                    : participant
            )
        );
    };

    // Calculate total percentage
    const totalPercentage = participants.reduce(
        (total, participant) => total + (Number(participant.percentage) || 0),
        0
    );

    const remainingPercentage = 100 - totalPercentage;

    // Split selected participants equally
    const splitEqually = () => {
        if (participants.length === 0) {
            return;
        }

        const equalPercentage = Math.floor((100 / participants.length) * 100) / 100;

        const updatedParticipants = participants.map((participant) => ({
            ...participant,
            percentage: equalPercentage
        }));

        // Fix rounding difference
        const currentTotal = updatedParticipants.reduce(
            (sum, participant) => sum + Number(participant.percentage),
            0
        );

        const difference = Math.round((100 - currentTotal) * 100) / 100;

        if (difference !== 0) {
            const lastIndex = updatedParticipants.length - 1;
            updatedParticipants[lastIndex].percentage =
                Number(updatedParticipants[lastIndex].percentage) + difference;
        }

        setParticipants(updatedParticipants);
    };

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (!name.trim()) {
            setError("Enter an expense name.");
            return;
        }

        if (!amount || Number(amount) <= 0) {
            setError("Enter a valid amount.");
            return;
        }

        if (!payerId) {
            setError("Select who paid.");
            return;
        }

        if (participants.length === 0) {
            setError("Select at least one participant.");
            return;
        }

        const invalidPercentage = participants.some(
            (participant) =>
                participant.percentage === "" ||
                Number(participant.percentage) < 0 ||
                Number(participant.percentage) > 100
        );

        if (invalidPercentage) {
            setError("Each participant percentage must be between 0 and 100.");
            return;
        }

        if (Math.abs(totalPercentage - 100) > 0.01) {
            setError(
                `Participant percentages must add up to 100%. Current total: ${totalPercentage}%.`
            );
            return;
        }

        const expenseData = {
            name: name.trim(),
            amount: Number(amount),
            payer_id: Number(payerId),
            category: category,
            due_date: null,
            participants: participants.map((participant) => ({
                user_id: Number(participant.user_id),
                percentage: Number(participant.percentage)
            }))
        };

        try {
            await api.post(`/groups/${groupId}/expenses`, expenseData);
            navigate(`/groups/${groupId}`);
        } catch (error) {
            console.log(error);
            setError("Failed to create expense.");
        }
    }

    if (loading) {
        return (
            <div className="expense_form">
                <p className="loading">Loading group members…</p>
            </div>
        );
    }

    return (
        <div className="expense_form">
            <h2 className="form_title">Add Expense</h2>
            <form onSubmit={handleSubmit}>
                <div className="field">
                    <label>Expense Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Dinner, groceries, gas..."
                    />
                </div>

                <div className="field">
                    <label>Amount</label>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                    />
                </div>

                <div className="field">
                    <label>Category</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    >
                        <option value="Food">Food</option>
                        <option value="Transportation">Transportation</option>
                        <option value="Entertainment">Entertainment</option>
                        <option value="Shopping">Shopping</option>
                        <option value="Housing">Housing</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div className="field">
                    <label>Paid By</label>
                    <select
                        value={payerId}
                        onChange={(e) => setPayerId(Number(e.target.value))}
                    >
                        <option value="" disabled>
                            Select payer
                        </option>
                        {members.map((member) => (
                            <option key={member.user_id} value={member.user_id}>
                                {member.username}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="participant_header">
                    <label>Split Between</label>
                    <button
                        type="button"
                        className="split_equally_button"
                        onClick={splitEqually}
                    >
                        Split Equally
                    </button>
                </div>

                <div className="checkbox_group">
                    {members.map((member) => {
                        const userId = Number(member.user_id);
                        const participant = participants.find(
                            (p) => p.user_id === userId
                        );
                        const selected = !!participant;

                        return (
                            <div
                                key={member.user_id}
                                className={`checkbox_row ${selected ? "selected" : ""}`}
                            >
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={selected}
                                        onChange={() => handleParticipantToggle(userId)}
                                    />
                                    {member.username}
                                </label>

                                {selected && (
                                    <div className="percentage_input">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            value={participant.percentage}
                                            onChange={(e) =>
                                                handlePercentageChange(
                                                    userId,
                                                    e.target.value
                                                )
                                            }
                                        />
                                        <span>%</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {participants.length > 0 && (
                    <div
                        className={`percentage_summary ${
                            Math.abs(totalPercentage - 100) < 0.01
                                ? "complete"
                                : "incomplete"
                        }`}
                    >
                        <div>
                            Total
                            <strong>{totalPercentage}%</strong>
                        </div>
                        <div>
                            Remaining
                            <strong>{remainingPercentage}%</strong>
                        </div>
                    </div>
                )}

                {error && <p className="error">{error}</p>}

                <div className="form_actions">
                    <button
                        type="button"
                        className="btn_secondary"
                        onClick={() => navigate(`/groups/${groupId}`)}
                    >
                        Cancel
                    </button>
                    <button type="submit" className="btn_primary">
                        Add Expense
                    </button>
                </div>
            </form>
        </div>
    );
}

export default Expense;
