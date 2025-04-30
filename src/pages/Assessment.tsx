
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAssessment } from '../contexts/AssessmentContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Form } from '@/components/ui/form';
import QuestionCard from '@/components/AssessmentForm';
import { CheckCircle, ShieldCheck, AlertCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const QUESTIONS_PER_PAGE = 5;

const Assessment = () => {
  const { user, logout } = useAuth();
  const { 
    assessment, 
    createNewAssessment, 
    updateQuestion, 
    calculateResults, 
    completeAssessment 
  } = useAssessment();
  const [storeName, setStoreName] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const navigate = useNavigate();
  
  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Handle store name submission
  const handleCreateAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (storeName.trim() === '') {
      toast.error("Please enter a store name");
      return;
    }
    createNewAssessment(storeName);
  };
  
  // Calculate progress
  const calculateProgress = () => {
    if (!assessment) return 0;
    
    const answeredCount = assessment.questions.filter(q => q.answer !== null).length;
    return Math.round((answeredCount / assessment.questions.length) * 100);
  };
  
  // Handle question update
  const handleQuestionUpdate = (questionId: number, answer: any, comment: string, images: string[]) => {
    updateQuestion(questionId, answer, comment, images);
  };
  
  // Get current page questions
  const getCurrentPageQuestions = () => {
    if (!assessment) return [];
    
    const startIndex = currentPage * QUESTIONS_PER_PAGE;
    return assessment.questions.slice(startIndex, startIndex + QUESTIONS_PER_PAGE);
  };
  
  // Handle page navigation
  const handleNextPage = () => {
    if (!assessment) return;
    
    const maxPage = Math.ceil(assessment.questions.length / QUESTIONS_PER_PAGE) - 1;
    if (currentPage < maxPage) {
      setCurrentPage(currentPage + 1);
      window.scrollTo(0, 0);
    }
  };
  
  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
      window.scrollTo(0, 0);
    }
  };
  
  // Handle assessment completion
  const handleComplete = () => {
    const unansweredCount = assessment?.questions.filter(q => q.answer === null).length || 0;
    
    if (unansweredCount > 0) {
      toast.error(`Please answer all questions. ${unansweredCount} question(s) remaining.`);
      return;
    }
    
    completeAssessment();
    navigate('/results');
  };
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-hsse-blue" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center">
            <ShieldCheck className="h-8 w-8 text-hsse-blue mr-2" />
            <h1 className="text-xl font-bold text-gray-900">HSSE Assessment Tool</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Logged in as <span className="font-semibold">{user.name}</span>
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => logout()}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!assessment ? (
          <Card>
            <CardHeader>
              <CardTitle>New HSSE Assessment</CardTitle>
            </CardHeader>
            <form onSubmit={handleCreateAssessment}>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="storeName">Store Name</Label>
                    <Input
                      id="storeName"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Enter the store name"
                      required
                    />
                  </div>
                  
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Information</AlertTitle>
                    <AlertDescription>
                      This assessment contains 20 questions. Each answer of "Yes" contributes 5 points.
                      Final score will be calculated as percentage of "Yes" answers out of total applicable questions.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full bg-hsse-blue hover:bg-hsse-lightBlue">
                  Start Assessment
                </Button>
              </CardFooter>
            </form>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{assessment.storeName}</h2>
                <span className="text-sm text-gray-500">
                  {new Date(assessment.date).toLocaleDateString()}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{calculateProgress()}%</span>
                </div>
                <Progress value={calculateProgress()} className="h-2" />
              </div>
            </div>
            
            <div>
              {getCurrentPageQuestions().map((question) => (
                <QuestionCard
                  key={question.id}
                  questionNumber={question.id}
                  questionText={question.text}
                  answer={question.answer}
                  comment={question.comment}
                  images={question.images}
                  onUpdate={(answer, comment, images) => 
                    handleQuestionUpdate(question.id, answer, comment, images)
                  }
                />
              ))}
            </div>
            
            <div className="flex justify-between pt-4">
              <Button 
                variant="outline" 
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                className="flex items-center"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              <div className="flex space-x-2">
                {assessment.completed ? (
                  <Button 
                    variant="outline"
                    onClick={() => navigate('/results')}
                  >
                    View Results
                  </Button>
                ) : (
                  <Button 
                    onClick={handleComplete}
                    className="bg-hsse-green hover:bg-green-600 text-white flex items-center"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Complete Assessment
                  </Button>
                )}
                
                <Button 
                  onClick={handleNextPage}
                  disabled={currentPage >= Math.ceil(assessment.questions.length / QUESTIONS_PER_PAGE) - 1}
                  className="bg-hsse-blue hover:bg-hsse-lightBlue flex items-center"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Assessment;
