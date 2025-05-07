
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        console.log("Index page - Auth state:", { user, loading });

        if (!loading) {
          if (user) {
            navigate("/assessment", { replace: true });
          } else {
            navigate("/login", { replace: true });
          }
        }
      } catch (error) {
        console.error("Authentication error:", error);
        toast.error("Authentication failed. Please reload the page.");
      }
    };

    checkAuthState();
  }, [user, loading, navigate]);

  // Show a loading spinner while determining authentication state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <div className="ml-4">Checking authentication...</div>
      </div>
    );
  }

  // Return null as a fallback, as navigation will happen in useEffect
  return null;
};

export default Index;
