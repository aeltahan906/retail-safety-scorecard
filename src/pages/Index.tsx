
import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Index = () => {
  const { user, loading } = useAuth();
  
  // Show a blank page while loading auth state
  if (loading) {
    return null;
  }
  
  // Redirect based on auth state
  return user ? <Navigate to="/assessment" /> : <Navigate to="/login" />;
};

export default Index;
