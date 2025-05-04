
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { AssessmentProvider } from "./contexts/AssessmentContext";
import Login from "./pages/Login";
import Assessment from "./pages/Assessment";
import Results from "./pages/Results";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";

// Create a new client for React Query
const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <AssessmentProvider>
              <Toaster />
              <Sonner />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/assessment" element={<Assessment />} />
                <Route path="/results" element={<Results />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AssessmentProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
