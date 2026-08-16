import { useState } from 'react';
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import api from "./api/axios";

function Register() {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState({});

    const handleSubmit = async (event) => {
        event.preventDefault();

        const newErrors = {};
        if (!email.trim()) newErrors.email = true;
        if (!username.trim()) newErrors.username = true;
        if (!password.trim()) newErrors.password = true;
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        try {
            const response = await api.post("/register", {
                username,
                email,
                password
            });

            console.log("SUCCESS:", response.data);
            alert(response.data.message);
            navigate("/");

        } catch (error) {
            console.log("FULL ERROR:", error);
            console.log("RESPONSE:", error.response);
            console.log("MESSAGE:", error.message);
            alert(JSON.stringify(error.response?.data));
        }
    };

    return (
        <div className="register_form">
            <form onSubmit={handleSubmit} noValidate>
                <h1 className="form_title">Create your account</h1>

                <div className="field_group">
                    <label htmlFor="email">
                        Email<span className="required">*</span>
                    </label>
                    <input
                        id="email"
                        className={`email ${errors.email ? "has_error" : ""}`}
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter email..."
                    />
                    {errors.email && (
                        <p className="error_text">Please complete this required field.</p>
                    )}
                </div>

                <div className="field_group">
                    <label htmlFor="username">
                        Username<span className="required">*</span>
                    </label>
                    <input
                        id="username"
                        className={`username ${errors.username ? "has_error" : ""}`}
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter username..."
                    />
                    {errors.username && (
                        <p className="error_text">Please complete this required field.</p>
                    )}
                </div>

                <div className="field_group">
                    <label htmlFor="password">
                        Password<span className="required">*</span>
                    </label>
                    <input
                        id="password"
                        className={`password ${errors.password ? "has_error" : ""}`}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password..."
                    />
                    {errors.password && (
                        <p className="error_text">Please complete this required field.</p>
                    )}
                </div>

                <button type="submit" className="rg_button">
                    Register
                </button>

                <p className="footer_text">
                    Already have an account?{" "}
                    <Link to="/Login" className="login_link">Log in</Link>
                </p>
            </form>
        </div>
    );
}

export default Register;