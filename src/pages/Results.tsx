import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAssessment } from '../contexts/AssessmentContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ShieldCheck, Loader2, ArrowLeft, CheckCircle, X, Download, AlertTriangle } from 'lucide-react';
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Assessment Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center space-x-4">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center ${getScoreBackground(results.percentage)}`}>
                <span className={`text-4xl font-bold ${getScoreColor(results.percentage)}`}>{results.percentage}%</span>
              </div>
              <div>
                <h3 className="text-lg font-medium">Overall Score</h3>
                <p className="text-sm text-gray-500">Based on {results.applicableQuestions} applicable questions.</p>
              </div>
            </div>

            <Progress value={results.percentage} className="h-4" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-md bg-gray-50">
                <h4 className="text-md font-semibold">Total Questions</h4>
                <p className="text-gray-600">{results.totalQuestions}</p>
              </div>
              <div className="p-4 rounded-md bg-gray-50">
                <h4 className="text-md font-semibold">Applicable Questions</h4>
                <p className="text-gray-600">{results.applicableQuestions}</p>
              </div>
              <div className="p-4 rounded-md bg-gray-50">
                <h4 className="text-md font-semibold">"Yes" Answers</h4>
                <p className="text-green-600 font-medium">{results.yesAnswers}</p>
              </div>
              <div className="p-4 rounded-md bg-gray-50">
                <h4 className="text-md font-semibold">"No" Answers</h4>
                <p className="text-red-600 font-medium">{results.applicableQuestions - results.yesAnswers}</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={() => navigate('/assessment')} className="flex items-center">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Assessment
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </CardFooter>
        </Card>

        {/* Detailed Results */}
        <section className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Detailed Results</h2>
          <div className="space-y-4">
            {assessment.questions.map((question, index) => (
              <Card key={question.id} className="shadow-sm">
                <CardHeader>
                  <CardTitle>Question {question.question_number}</CardTitle>
                  <CardDescription>{question.question_text}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-2">
                    <strong>Your Answer:</strong>
                    {question.answer === 'yes' && <span className="text-green-600 font-medium">Yes</span>}
                    {question.answer === 'no' && <span className="text-red-600 font-medium">No</span>}
                    {question.answer === 'n/a' && <span className="text-gray-600 font-medium">N/A</span>}
                    {!question.answer && <span className="text-gray-600 font-medium">Not Answered</span>}
                  </div>
                  {question.comment && (
                    <div className="mb-2">
                      <strong>Comment:</strong>
                      <p className="text-gray-700">{question.comment}</p>
                    </div>
                  )}
                  {question.images && question.images.length > 0 && (
                    <div>
                      <strong>Images:</strong>
                      <div className="flex space-x-2 mt-2">
                        {question.images.map((image, imgIndex) => (
                          <img key={imgIndex} src={image} alt={`Question ${index + 1} - Image ${imgIndex + 1}`} className="w-24 h-24 object-cover rounded" />
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Results;
