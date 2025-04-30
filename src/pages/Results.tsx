
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAssessment } from '../contexts/AssessmentContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ShieldCheck, CheckCircle, X, ArrowLeft, Download, CheckCheck, AlertTriangle } from 'lucide-react';

const getScoreColor = (score: number) => {
  if (score >= 90) return "text-green-600";
  if (score >= 70) return "text-yellow-600";
  return "text-red-600";
};

const getScoreBackground = (score: number) => {
  if (score >= 90) return "bg-hsse-lightGreen";
  if (score >= 70) return "bg-hsse-yellow";
  return "bg-red-50";
};

const Results = () => {
  const { user } = useAuth();
  const { assessment, calculateResults } = useAssessment();
  const navigate = useNavigate();
  const results = assessment ? calculateResults() : null;
  
  // Redirect if not logged in or no assessment
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (!assessment) {
      navigate('/assessment');
    }
  }, [user, assessment, navigate]);
  
  // Helper function to get appropriate icons for answer types
  const getAnswerIcon = (answer: string | null) => {
    if (answer === 'yes') return <CheckCircle className="h-4 w-4 text-hsse-green" />;
    if (answer === 'no') return <X className="h-4 w-4 text-red-500" />;
    return <AlertTriangle className="h-4 w-4 text-gray-400" />;
  };
  
  if (!user || !assessment || !results) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center">
            <ShieldCheck className="h-8 w-8 text-hsse-blue mr-2" />
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
                <span>{assessment.storeName} Assessment</span>
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
                  <p className="text-xl font-semibold text-hsse-green">{results.yesAnswers}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full flex items-center justify-center"
                onClick={() => {
                  const assessmentData = JSON.stringify(assessment, null, 2);
                  const blob = new Blob([assessmentData], { type: 'application/json' });
                  const href = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = href;
                  link.download = `${assessment.storeName.replace(/\s+/g, '_')}_assessment_${new Date().toISOString().split('T')[0]}.json`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
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
              {assessment.questions.map((question) => (
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
                        {question.id}. {question.text}
                      </p>
                      
                      {question.comment && (
                        <div className="mt-2 text-sm text-gray-600">
                          <p className="font-medium">Comment:</p>
                          <p>{question.comment}</p>
                        </div>
                      )}
                      
                      {question.images.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-gray-600 mb-2">Evidence Photos:</p>
                          <div className="flex flex-wrap gap-2">
                            {question.images.map((img, index) => (
                              <img 
                                key={index}
                                src={img}
                                alt={`Evidence ${index + 1}`}
                                className="w-16 h-16 object-cover rounded-md border"
                              />
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
