import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api/axios";
import './Groups.css';

function Groups() {
    const [groups, setGroups] = useState([]);
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const res = await api.get("/groups");
                setGroups(res.data);
            } catch (error) {
                console.log("ERROR:", error);
            }
        };

        fetchGroups();
    }, []);

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

    async function removeGroup(groupId) {
        try {
            await api.delete(`/groups/${groupId}`);

            setGroups(groups.filter(group => group.id !== groupId));
        } catch (error) {
            console.log(error);
        }
    }

    return (
        <div className="groups-page">
            <h1 className="group">Groups</h1>
            <p className="description">
                Manage shared expenses among other individuals through our personalized group system.
                Track vacations, apartments, dining, and other group-related finances.
            </p>
            {groups.length === 0 ? (
                <p className="none">No groups created yet</p>
            ) : (
                <div className="groups-list">
                    {groups.map((group) => (
                        <div
                            key={group.id}
                            onClick={() => navigate(`/groups/${group.id}`)}
                            className="map1"
                        >
                            <div className="card-header">
                                <h2 className="name">{group.name}</h2>
                                <span className="capacity-badge">{group.user_count} members</span>
                            </div>
                            {group.subheading && <p className="subheading">{group.subheading}</p>}
                            {currentUser?.id === group.owner_id && (
                                <div className="card-footer">
                                    <button
                                        className="remove-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeGroup(group.id);
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <button onClick={() => navigate("/groups/new")} className="create_btn">
                Create Group
            </button>
        </div>
    );
}

export default Groups;