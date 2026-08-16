import './App.css';
import Navbar from './Navbar';
import Register from './Register';
import Groups from './Groups';
import Login from './Login';
import AddGroup from './AddGroup';
import GroupDetail from './GroupDetail';
import Invites from "./Invites";
import Dropdown from "./components/Dropdown/Dropdown";
import DropdownItem from "./components/DropdownItem/DropdownItem";
import Expense from './Expense';
import Me from './Me';
import ExpenseDetail from './ExpenseDetail';
import Payments from './Payments'
import MakePayment from './MakePayment'
import api from './api/axios';
import Dashboard from './Dashboard';
import { AuthProvider, useAuth } from './components/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';

// Home page (ONLY "/" route)
function Home() {
  const { isLoggedIn } = useAuth();
  return (
    <div className="home">
        <div className="hero">
            <h1>Manage Shared Expenses Without the Confusion</h1>

            <p className="subtitle">
                Create groups, split expenses, record payments, and keep
                everyone organized in one place.
            </p>

            {!isLoggedIn && (
                <div className="hero-buttons">
                    <Link to="/register" className="secondary-btn">
                        Create Account
                    </Link>
                    <h3>or</h3>
                    <Link to="/login" className="secondary-btn">
                        Sign In
                    </Link>
                </div>
            )}
        </div>

        <div className="feature-grid">

            <Link to="/groups" className="feature-card">
                <img src="/sharing.png" alt="Groups" />
                <h2>Groups</h2>
                <p>
                    Organize trips, roommates, clubs, and other shared
                    expenses.
                </p>
            </Link>

            <Link to="/payments" className="feature-card">
                <img src="/pay.png" alt="Payments" />
                <h2>Payments</h2>
                <p>
                    Record real-world payments and keep track of completed
                    settlements.
                </p>
            </Link>

            <Link to="/invites" className="feature-card">
                <img src="/letter.png" alt="Invites" />
                <h2>Invites</h2>
                <p>
                    Accept invitations and join new groups.
                </p>
            </Link>

            <Link to="/me" className="feature-card">
                <img src="/profile.png" alt="Profile" />
                <h2>Profile</h2>
                <p>
                    View your expenses, balances, payments, and activity.
                </p>
            </Link>

        </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <div className="app">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />

          <Route path="/groups" element={
            <ProtectedRoute><Groups /></ProtectedRoute>
          } />
          <Route path="/groups/new" element={
            <ProtectedRoute><AddGroup /></ProtectedRoute>
          } />
          <Route path="/groups/:id" element={
            <ProtectedRoute><GroupDetail /></ProtectedRoute>
          } />
          <Route path="/invites" element={
            <ProtectedRoute><Invites /></ProtectedRoute>
          } />
          <Route path='/groups/:groupId/expense' element={
            <ProtectedRoute><Expense /></ProtectedRoute>
          } />
          <Route path='/me' element={
            <ProtectedRoute><Me /></ProtectedRoute>
          } />
          <Route path='/expenses/:id' element={
            <ProtectedRoute><ExpenseDetail /></ProtectedRoute>
          } />
          <Route path='/payments' element={
            <ProtectedRoute><Payments /></ProtectedRoute>
          } />
          <Route path="/groups/:groupId/pay/:toUserId" element={
            <ProtectedRoute><MakePayment /></ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          }/>
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;