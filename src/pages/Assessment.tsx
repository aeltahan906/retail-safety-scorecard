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
import QuestionCard from '@/components/AssessmentForm';
import { CheckCircle, ShieldCheck, AlertCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const QUESTIONS_PER_PAGE = 5;

const Assessment = () => {
  const { user, signOut } = useAuth();
  const { 
    currentAssessment, 
    savedAssessments,
    loading,
    fetchAssessments,
    createNewAssessment, 
    updateQuestion, 
    calculateResults,
    loadAssessment,
    completeAssessment 
  } = useAssessment();
  const [storeName, setStoreName] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();
  
  // Redirect if not logged in
  useEffect(() => {
  const fetchAssessment = async () => {
    try {
      setLoading(true);
      // Simulate API call or actual assessment loading logic
      await loadAssessment(assessmentId);
    } catch (error) {
      console.error("Error loading assessment:", error);
      toast.error("Failed to load assessment. Please try again.");
    } finally {
      setLoading(false); // Ensure loading is stopped
    }
  };

  fetchAssessment(); // Call the function
}, [assessmentId, loadAssessment]);

// Replace the spinner logic with this
if (loading || !user) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );
}
    
    
    setIsCreating(true);
    
    try {
      await createNewAssessment(storeName);
      setCurrentPage(0); // Reset to first page
    } finally {
      setIsCreating(false);
    }
  };
  
  // Calculate progress
  const calculateProgress = () => {
    if (!currentAssessment) return 0;
    
    const answeredCount = currentAssessment.questions.filter(q => q.answer !== null).length;
    return Math.round((answeredCount / currentAssessment.questions.length) * 100);
  };
  
  // Handle question update
  const handleQuestionUpdate = (questionId: string, answer: 'yes' | 'no' | 'n/a' | null, comment: string, images: string[]) => {
    updateQuestion(questionId, answer, comment, images);
  };
  
  // Get current page questions
  const getCurrentPageQuestions = () => {
    if (!currentAssessment) return [];
    
    const startIndex = currentPage * QUESTIONS_PER_PAGE;
    return currentAssessment.questions.slice(startIndex, startIndex + QUESTIONS_PER_PAGE);
  };
  
  // Handle page navigation
  const handleNextPage = () => {
    if (!currentAssessment) return;
    
    const maxPage = Math.ceil(currentAssessment.questions.length / QUESTIONS_PER_PAGE) - 1;
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
  const handleComplete = async () => {
    if (!currentAssessment) return;
    
    const unansweredCount = currentAssessment.questions.filter(q => q.answer === null).length;
    
    if (unansweredCount > 0) {
      toast.error(`Please answer all questions. ${unansweredCount} question(s) remaining.`);
      return;
    }
    
    await completeAssessment();
    navigate('/results');
  };
  
  // Handle loading a saved assessment
  const handleLoadAssessment = async (assessmentId: string) => {
    await loadAssessment(assessmentId);
    setCurrentPage(0); // Reset to first page
  };
  
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
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
            <h1 className="text-xl font-bold text-gray-900">HSSE Assessment Tool</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Logged in as <span className="font-semibold">{user.name}</span>
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => signOut()}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!currentAssessment ? (
          <div className="space-y-6">
            {/* New Assessment Form */}
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
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : "Start Assessment"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
            
            {/* Saved Assessments List */}
            {savedAssessments.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold mb-4">Saved Assessments</h2>
                <div className="space-y-4">
                  {savedAssessments.map((assessment) => (
                    <Card key={assessment.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">{assessment.store_name}</h3>
                            <p className="text-sm text-gray-500">
                              {new Date(assessment.date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            {assessment.completed ? (
                              <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => navigate(`/results?id=${assessment.id}`)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                View Results
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => handleLoadAssessment(assessment.id)}
                              >
                                Continue
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{currentAssessment.store_name}</h2>
                <span className="text-sm text-gray-500">
                  {new Date(currentAssessment.date).toLocaleDateString()}
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
                  id={question.id}
                  questionNumber={question.question_number}
                  questionText={question.question_text}
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
                {currentAssessment.completed ? (
                  <Button 
                    variant="outline"
                    onClick={() => navigate(`/results?id=${currentAssessment.id}`)}
                  >
                    View Results
                  </Button>
                ) : (
                  <Button 
                    onClick={handleComplete}
                    className="bg-green-600 hover:bg-green-700 text-white flex items-center"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Complete Assessment
                  </Button>
                )}
                
                <Button 
                  onClick={handleNextPage}
                  disabled={currentPage >= Math.ceil(currentAssessment.questions.length / QUESTIONS_PER_PAGE) - 1}
                  className="bg-blue-600 hover:bg-blue-700 flex items-center"
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
