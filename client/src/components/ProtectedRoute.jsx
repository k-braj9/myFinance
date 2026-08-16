import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

function ProtectedRoute({ children }) {
  const { isLoggedIn, isLoading } = useAuth();
  const location = useLocation();

  // Wait for the token verification to finish before deciding anything
  if (isLoading) {
    return <div className="loading-screen">Loading...</div>; // or a spinner component
  }

  if (!isLoggedIn) {
    // Send them to login, but remember where they were headed
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;