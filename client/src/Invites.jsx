import { useEffect, useState } from "react";
import api from "./api/axios";
import "./Invites.css";

function Invites() {
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchInvites() {
            try {
                const res = await api.get("/invites");
                setInvites(res.data);
            } catch (err) {
                console.log(err);
                setError("Failed to load invites.");
            } finally {
                setLoading(false);
            }
        }

        fetchInvites();
    }, []);

    async function acceptInvite(inviteId) {
        try {
            await api.post(`/invites/${inviteId}/accept`);

            setInvites(
                invites.filter(invite => invite.id !== inviteId)
            );
        } catch (err) {
            console.log(err);
        }
    }

    async function declineInvite(inviteId) {
        try {
            await api.delete(`/invites/${inviteId}`);

            setInvites(
                invites.filter(invite => invite.id !== inviteId)
            );
        } catch (err) {
            console.log(err);
        }
    }

    return (
        <div className="invites-page">

            <div className="invites-header">
                <div>
                    <h1 className="invites-title">Invites</h1>
                    <p className="notice">
                        Manage your pending group invitations.
                    </p>
                </div>
            </div>


            {loading ? (
                <p className="none">Loading...</p>
            ) : error ? (
                <p className="none">{error}</p>
            ) : invites.length === 0 ? (
                <p className="none">
                    No pending invites.
                </p>
            ) : (

                <div className="invites-list">

                    {invites.map((invite) => (
                        <div
                            key={invite.id}
                            className="invite-card"
                        >
                            <div className="invite-top">
                                <div className="invite-info">
                                    <h3>
                                        {invite.sender_name} invited you
                                    </h3>
                                    <p>
                                        Group: {invite.group_name}
                                    </p>
                                </div>
                            </div>
                            <div className="invite-bottom">

                                <button
                                    className="accept"
                                    onClick={() =>
                                        acceptInvite(invite.id)
                                    }
                                >
                                    Accept
                                </button>


                                <button
                                    className="decline"
                                    onClick={() =>
                                        declineInvite(invite.id)
                                    }
                                >
                                    Decline
                                </button>

                            </div>

                        </div>
                    ))}

                </div>

            )}

        </div>
    );
}

export default Invites;