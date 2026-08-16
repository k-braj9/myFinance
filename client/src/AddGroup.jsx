import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api/axios";
import './AddGroup.css';

function AddGroup() {
    const [name, setName] = useState("");
    const [subheading, setSubheading] = useState("");
    const [user_count, setUserCount] = useState(0);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        try {
            e.preventDefault();
            await api.post("/groups", {
                name,
                user_count,
                subheading
            });
            navigate("/groups");
        } catch(error) {

            console.log("ERROR:", error);
            console.log(error.response?.data);

            alert("Failed to create group");
        }
    };

    return (
        <div className="add-group-page">
            <form onSubmit={handleSubmit} className="add-group-form">
                <h1 className="form-title">Create Group</h1>
                <input
                    type="text"
                    placeholder="Group Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-input"
                />
                <input
                    type="text"
                    placeholder="Description"
                    value={subheading}
                    onChange={(e) => setSubheading(e.target.value)}
                    className="form-input"
                />
                <input
                    type="number"
                    placeholder="Number of Members"
                    value={user_count}
                    onChange={(e) => setUserCount(Number(e.target.value))}
                    className="form-input"
                />
                <button type="submit" className="form-submit">
                    Create Group
                </button>
            </form>
        </div>
    );
}

export default AddGroup;