import { useState } from "react";
import "./Dropdown.css";

function Dropdown({ buttonText, children }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="dropdown">
            <button onClick={() => setOpen(!open)}>
                {buttonText}
            </button>

            {open && (
                <div className="dropdown-content">
                    {children}
                </div>
            )}
        </div>
    );
}

export default Dropdown;