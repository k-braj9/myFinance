import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "./api/axios";
import "./EditGroup.css";

function EditGroup() {
    const { id } = useParams();
    const [name, setName] = useState("");
    const [subheading, setSubheading] = useState("");
    const [error, setError] = useState("");

    const navigate = useNavigate();

    useEffect(() => {
        const fetchGroup = async () => {
            try {
                const response = await api.get(`/groups/${id}`);
                const group = response.data;

                setName(group.name);
                setSubheading(group.subheading ?? "");
            } catch (error) {
                console.log(error);
                setError("Could not load group.");
            }
        };
        fetchGroup();
    }, [id]);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (!name.trim()) {
            setError("Group name is required.");
            return;
        }

        try {
            await api.put(`/groups/${id}`, {
                name,
                subheading
            });

            navigate(-1);
        } catch (error) {
            console.log(error);
            const detail = error.response?.data?.detail;
            const message = Array.isArray(detail)
                ? detail.map(d => d.msg).join(", ")
                : (detail || "Failed to update group");
            setError(message);
        }
    }

    return (
        <div className="group_form">
            <form onSubmit={handleSubmit}>

                <input
                    type="text"
                    value={name}
                    placeholder="Group Name"
                    onChange={(e) => setName(e.target.value)}
                />

                <input
                    type="text"
                    value={subheading}
                    placeholder="Subheading"
                    onChange={(e) => setSubheading(e.target.value)}
                />

                {error && <p className="error">{error}</p>}

                <button type="submit">Save Changes</button>
            </form>
        </div>
    );
}

export default EditGroup;