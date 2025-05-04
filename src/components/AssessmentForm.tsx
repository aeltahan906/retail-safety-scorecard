
import React, { useEffect } from 'react';
import { toast } from 'sonner';
import QuestionCard from './QuestionCard';
import { useAssessment } from '@/contexts/AssessmentContext';

const AssessmentForm: React.FC = () => {
  const { currentAssessment, updateQuestion, loading } = useAssessment();
  
  useEffect(() => {
    if (!currentAssessment && !loading) {
      console.log("No assessment loaded, but loading is complete");
    }
  }, [currentAssessment, loading]);
  
  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-6 w-32 bg-gray-200 mb-4 rounded"></div>
          <div className="h-40 w-full max-w-md bg-gray-200 rounded mb-4"></div>
          <div className="h-40 w-full max-w-md bg-gray-200 rounded"></div>
        </div>
        <div className="mt-4">Loading assessment...</div>
      </div>
    );
  }
  
  if (!currentAssessment) {
    return (
      <div className="p-8 text-center">
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <p className="text-yellow-800">No assessment loaded. Please create or select an assessment.</p>
        </div>
      </div>
    );
  }
  
  // Sort questions by question number
  const sortedQuestions = [...currentAssessment.questions].sort(
    (a, b) => a.question_number - b.question_number
  );
  
  // Handler for when a question is updated
  const handleQuestionUpdate = (questionId: string, answer: 'yes' | 'no' | 'n/a' | null, comment: string, images: string[]) => {
    try {
      updateQuestion(questionId, answer, comment || null, images);
    } catch (error) {
      console.error("Error updating question:", error);
      toast.error("Failed to update question. Please try again.");
    }
  };
  
  return (
    <div className="p-4">
      {sortedQuestions.length > 0 ? (
        sortedQuestions.map((question) => (
          <QuestionCard
            key={question.id}
            id={question.id}
            questionNumber={question.question_number}
            questionText={question.question_text}
            answer={question.answer}
            comment={question.comment || ""}
            images={question.images || []}
            onUpdate={(answer, comment, images) => 
              handleQuestionUpdate(question.id, answer, comment, images)
            }
          />
        ))
      ) : (
        <div className="p-4 text-center">No questions found for this assessment.</div>
      )}
    </div>
  );
};

export default AssessmentForm;
