import React from "react";
import "./DropdownButton.css";
import { FaChevronDown } from "react-icons/fa";

const DropdownButton = ({ children, open, toggle }) => {
    return (
        <button className="button" onClick={toggle}>
            {children}
            <span className="arrow">
                <FaChevronDown />
            </span>
        </button>
    );
};

export default DropdownButton;