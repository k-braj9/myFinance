import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";
import { useAuth } from './components/AuthContext';
import Dropdown from "./components/Dropdown/Dropdown";
import DropdownItem from "./components/DropdownItem/DropdownItem";

function Navbar() {
    const navigate = useNavigate();
    const { isLoggedIn } = useAuth();

    function handleLogout() {
        localStorage.removeItem("token");
        navigate("/login");
    }

    return (
        <div className="navbar">
            <div className="header">
                <Link to="/">
                    <img src="logo.png" alt="Logo"/>
                    <h1>MyFinance</h1>
                </Link>
            </div>

            <div className="nav-right">
                {isLoggedIn && (
                    <nav className="nav-tabs">
                        <Link to="/dashboard" className="nav-tab">Dashboard</Link>
                        <Link to="/groups" className="nav-tab">Groups</Link>
                        <Link to="/payments" className="nav-tab">Payments</Link>
                    </nav>
                )}

                {isLoggedIn ? (
                    <Dropdown buttonText={<img src="/icon.png" className="icon" alt="Account menu" />}>
                        <DropdownItem>
                            <Link to="/me">Profile</Link>
                        </DropdownItem>
                        <DropdownItem>
                            <Link to="/login" onClick={handleLogout}>Logout</Link>
                        </DropdownItem>
                        <DropdownItem>
                            <Link to="/invites">Invites</Link>
                        </DropdownItem>
                    </Dropdown>
                ) : (
                    <div className="auth-links">
                        <Link to="/login" className="signin-btn">Sign in</Link>
                        <Link to="/register" className="register-link">Register</Link>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Navbar;