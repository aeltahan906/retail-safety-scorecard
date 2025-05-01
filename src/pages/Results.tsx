
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAssessment } from '../contexts/AssessmentContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ShieldCheck, CheckCircle, X, ArrowLeft, Download, AlertTriangle, Loader2 } from 'lucide-react';
import { AssessmentWithQuestions, AssessmentResult } from '@/types/database';

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
  const [assessment, setAssessment] = useState<AssessmentWithQuestions | null>(null);
  const [results, setResults] = useState<AssessmentResult | null>(null);
  
  // Get assessment ID from URL query param
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const assessmentId = searchParams.get('id');
    
    const fetchAssessment = async () => {
      if (assessmentId && (!currentAssessment || currentAssessment.id !== assessmentId)) {
        setLoading(true);
        await loadAssessment(assessmentId);
        setLoading(false);
      } else if (currentAssessment) {
        setAssessment(currentAssessment);
        setResults(calculateResults());
      }
    };
    
    fetchAssessment();
  }, [location.search, currentAssessment, loadAssessment, calculateResults]);
  
  // Update local state when currentAssessment changes
  useEffect(() => {
    if (currentAssessment) {
      setAssessment(currentAssessment);
      setResults(calculateResults());
    }
  }, [currentAssessment, calculateResults]);
  
  // Redirect if not logged in or no assessment
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (!assessment && !loading) {
      navigate('/assessment');
    }
  }, [user, assessment, loading, navigate]);
  
  // Helper function to get appropriate icons for answer types
  const getAnswerIcon = (answer: string | null) => {
    if (answer === 'yes') return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (answer === 'no') return <X className="h-4 w-4 text-red-500" />;
    return <AlertTriangle className="h-4 w-4 text-gray-400" />;
  };
  
  if (!user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }
  
  if (!assessment || !results) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">No assessment data available</p>
          <Button 
            className="mt-4"
            onClick={() => navigate('/assessment')}
          >
            Go to Assessments
          </Button>
        </div>
      </div>
    );
  }
  
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
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>{assessment.store_name} Assessment</span>
                <span className="text-sm text-gray-500">
                  {new Date(assessment.date).toLocaleDateString()}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Score */}
              <div className={`p-6 rounded-lg ${getScoreBackground(results.percentage)}`}>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Overall Safety Score</p>
                  <div className={`text-5xl font-bold mt-2 ${getScoreColor(results.percentage)}`}>
                    {results.percentage}%
                  </div>
                  <p className="text-sm mt-2 text-gray-600">
                    {results.yesAnswers} of {results.applicableQuestions} standards met
                  </p>
                </div>
                <Progress 
                  value={results.percentage} 
                  className="h-2 mt-4" 
                />
              </div>
              
              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-xs text-gray-500">Total Questions</p>
                  <p className="text-xl font-semibold">{results.totalQuestions}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-xs text-gray-500">Applicable Items</p>
                  <p className="text-xl font-semibold">{results.applicableQuestions}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-xs text-gray-500">Standards Met</p>
                  <p className="text-xl font-semibold text-green-600">{results.yesAnswers}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full flex items-center justify-center"
                onClick={() => {
                  // Create a downloadable report
                  const reportData = {
                    assessment: {
                      id: assessment.id,
                      storeName: assessment.store_name,
                      date: assessment.date,
                      completed: assessment.completed
                    },
                    results: {
                      totalQuestions: results.totalQuestions,
                      applicableQuestions: results.applicableQuestions,
                      yesAnswers: results.yesAnswers,
                      percentage: results.percentage
                    },
                    questions: assessment.questions.map(q => ({
                      number: q.question_number,
                      text: q.question_text,
                      answer: q.answer,
                      comment: q.comment,
                      images: q.images
                    }))
                  };
                  
                  const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `${assessment.store_name.replace(/\s+/g, '_')}_assessment_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-4 w-4 mr-1" />
                Download Report
              </Button>
            </CardFooter>
          </Card>
          
          {/* Detailed Results */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Question Results</h2>
            
            <div className="space-y-4">
              {assessment.questions
                .sort((a, b) => a.question_number - b.question_number)
                .map((question) => (
                <div 
                  key={question.id}
                  className="bg-white p-4 rounded-lg border shadow-sm"
                >
                  <div className="flex items-start">
                    <div className="mr-3 mt-1">
                      {getAnswerIcon(question.answer)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {question.question_number}. {question.question_text}
                      </p>
                      
                      {question.comment && (
                        <div className="mt-2 text-sm text-gray-600">
                          <p className="font-medium">Comment:</p>
                          <p>{question.comment}</p>
                        </div>
                      )}
                      
                      {question.images && question.images.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-gray-600 mb-2">Evidence Photos:</p>
                          <div className="flex flex-wrap gap-2">
                            {question.images.map((img, index) => (
                              <a 
                                key={index}
                                href={img}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img 
                                  src={img}
                                  alt={`Evidence ${index + 1}`}
                                  className="w-16 h-16 object-cover rounded-md border hover:opacity-90 transition-opacity"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-2 flex items-center">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          question.answer === 'yes' 
                            ? 'bg-green-100 text-green-800' 
                            : question.answer === 'no'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}>
                          {question.answer === 'yes' 
                            ? 'Compliant' 
                            : question.answer === 'no'
                              ? 'Non-compliant'
                              : 'Not Applicable'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Results;
