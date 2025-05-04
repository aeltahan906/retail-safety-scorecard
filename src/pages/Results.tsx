import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAssessment } from '../contexts/AssessmentContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ShieldCheck, CheckCircle, X, ArrowLeft, Download, AlertTriangle, Loader2 } from 'lucide-react';
import { AssessmentWithQuestions, AssessmentResult, QuestionWithImages } from '@/types/database';

const getScoreColor = (score: number) => {
  if (score >= 90) return "text-green-600";
  if (score >= 70) return "text-yellow-600";
  return "text-red-600";
};

const getScoreBackground = (score: number) => {
  if (score >= 90) return "bg-green-50";
  if (score >= 70) return "bg-yellow-50";
  return "bg-red-50";
};

const Results = () => {
  const { user } = useAuth();
  const { currentAssessment, calculateResults, loadAssessment } = useAssessment();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<AssessmentWithQuestions | null>(null);
  const [results, setResults] = useState<AssessmentResult | null>(null);

  // Get assessment ID from URL query param
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const assessmentId = searchParams.get('id');

    const fetchAssessment = async () => {
      try {
        setLoading(true);
        setError(null);

        if (assessmentId && (!currentAssessment || currentAssessment.id !== assessmentId)) {
          await loadAssessment(assessmentId);
        } else if (currentAssessment) {
          setAssessment(currentAssessment);
          setResults(calculateResults());
        }
      } catch (err) {
        console.error("Error loading assessment:", err);
        setError("Failed to load the assessment. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [location.search, currentAssessment, loadAssessment, calculateResults]);

  // Add timeout fallback to avoid infinite loading
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 10000); // Timeout after 10 seconds
    return () => clearTimeout(timer); // Cleanup timer on component unmount
  }, []);

  // Update local state when currentAssessment changes
  useEffect(() => {
    if (currentAssessment) {
      setAssessment(currentAssessment);
      setResults(calculateResults());
    }
  }, [currentAssessment, calculateResults]);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!assessment || !results) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">No assessment data found.</p>
      </div>
    );
  }

  // Rest of the component (unchanged)
  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center">
            <ShieldCheck className="h-8 w-8 text-blue-600 mr-2" />
            <h1 className="text-xl font-bold text-gray-900">HSSE Assessment Results</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/assessment')}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Assessment
          </Button>
        </div>
      </header>

      {/* The rest of the UI */}
      {/* ... */}
    </div>
  );
};

export default Results;
