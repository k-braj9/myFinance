import { useEffect, useState } from "react";
import api from "./api/axios";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import './Dashboard.css';

function Dashboard() {
    const [me, setMe] = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [availableMonths, setAvailableMonths] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const COLORS = ["#0088fe", "#00c49f", "#FFBB28", "#FF8042", "#F44236", "#808080"]

    const formatMonthLabel = (monthStr) => {
        const [year, month] = monthStr.split("-");
        const d = new Date(Number(year), Number(month) - 1, 1);
        return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    };

    // Load user info + list of months that actually have expense data
    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const meRes = await api.get("/me");
                setMe(meRes.data);

                const monthsRes = await api.get("/dashboard/months");
                const months = monthsRes.data?.months || [];
                setAvailableMonths(months);

                // Default to the most recent month with data, if any
                if (months.length) {
                    setSelectedMonth(months[0]);
                } else {
                    setLoading(false);
                }
            } catch (error) {
                console.error(error);
                setError("Could not load dashboard.");
                setLoading(false);
            }
        };
        fetchInitial();
    }, []);

    // Fetch dashboard data whenever the selected month changes
    useEffect(() => {
        if (!selectedMonth) return;

        const fetchDashboard = async () => {
            setLoading(true);
            try {
                const dashRes = await api.get("/dashboard", {
                    params: { month: selectedMonth },
                });
                setDashboard(dashRes.data);
                setError(null);
            } catch (error) {
                console.error(error);
                setError("Could not load dashboard.");
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
    }, [selectedMonth]);

    if (error) {
        return <h2>{error}</h2>;
    }

    const selectedLabel = selectedMonth ? formatMonthLabel(selectedMonth) : null;

    return (
        <div className="dash_body">
            <div className="dash-header">
                <h1>
                    Welcome back, {me?.username}!
                </h1>
                <p className="sub">Welcome to your own personal dashboard! A hub to overview your top groups, recent payments, and payment summaries.</p>
                <div className="dash-row">
                    <div className="dash-card">
                        <h2>Groups</h2>
                        <p>{dashboard?.group_count}</p>
                    </div>
                    <div className="dash-card">
                        <h2>Total Owed</h2>
                        <p>
                            ${dashboard?.total_you_owe?.toFixed(2)}
                        </p>
                    </div>
                    <div className="dash-card">
                        <h2>Incoming Payments</h2>
                        <p>
                            ${dashboard?.total_owed_to_you?.toFixed(2)}
                        </p>
                    </div>
                </div>
            </div>
            <div className="top-groups">
                <h2>Top Groups</h2>
                {dashboard?.top_groups?.map((group) => (
                    <div key={group.group_id} className="top-group-card">
                        <span>{group.group_name}</span>
                        <span>{group.activity_count} expenses</span>
                    </div>
                ))}
            </div>
            <div className="monthly-payments">
                <div className="monthly-payments-header">
                    <h2>Monthly Expense Spending</h2>
                    {availableMonths.length > 0 && (
                        <select
                            className="month-select"
                            value={selectedMonth || ""}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        >
                            {availableMonths.map((value) => (
                                <option key={value} value={value}>
                                    {formatMonthLabel(value)}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
                {!availableMonths.length ? (
                    <p className="empty-state">No expenses recorded yet.</p>
                ) : loading ? (
                    <p className="empty-state">Loading spending data...</p>
                ) : dashboard?.monthly_payments?.length ? (
                    <div className="pie-chart-wrapper">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={dashboard.monthly_payments}
                                    dataKey="amount"
                                    nameKey="category"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    label={({ category, percent }) =>
                                        `${category} ${(percent * 100).toFixed(0)}%`
                                    }
                                >
                                    {dashboard.monthly_payments.map((_, index) => (
                                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <p className="empty-state">No spending data for {selectedLabel}.</p>
                )}
            </div>
            <div className="dash-activity">
                <h2>Recent Activity</h2>
                {dashboard?.recent_activity?.map((activity) => (
                    <div 
                        key={activity.expense_id} 
                        className="activity-card"
                    >
                        <h3>{activity.expense_name}</h3>
                        <p><strong>Group:</strong> {activity.group_name}</p>
                        <p><strong>Paid by:</strong> {activity.payer_username}</p>
                        <p><strong>Amount:</strong> ${activity.amount.toFixed(2)}</p>
                        <p><strong>Date:</strong>{" "}{new Date(activity.created_at).toLocaleDateString()}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Dashboard;