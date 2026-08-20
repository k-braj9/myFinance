import { useState } from 'react';
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from './components/AuthContext';
import api from "./api/axios";
import './Login.css';

function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const handleSubmit = async (event) => {
        event.preventDefault();

        const newErrors = {};
        if (!username.trim()) newErrors.username = true;
        if (!password.trim()) newErrors.password = true;
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        try {
            const formData = new URLSearchParams();
            formData.append("username", username);
            formData.append("password", password);
            formData.append("grant_type", "password");
            console.log("VITE_API_URL:", import.meta.env.VITE_API_URL);
            console.log("Axios baseURL:", api.defaults.baseURL);
            const response = await api.post(
                "/token",
                formData,
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                }
            );

            login(response.data.access_token);

            const from = location.state?.from?.pathname || "/";
            navigate(from, { replace: true });
        } catch (error) {
            console.log("FULL ERROR:", error);
            alert(JSON.stringify(error.response?.data));
        }
    };

    return (
        <div className="register_form">
            <form onSubmit={handleSubmit} noValidate>
                <h1 className="form_title">Login to your account</h1>

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

                <button type="submit" className="rg_button">Login</button>

                <p className="footer_text">
                    Don't have an account?{" "}
                    <Link to="/register" className="login_link">Create new account</Link>
                </p>
            </form>
        </div>
    );
}

export default Login;