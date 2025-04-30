
import React, { createContext, useContext, useState } from 'react';
import { Assessment, QuestionItem, AnswerType, AssessmentResult } from '../types/assessment';
import { toast } from "sonner";
import { useAuth } from './AuthContext';

// Define default questions
const DEFAULT_QUESTIONS: QuestionItem[] = [
  { id: 1, text: "Is there a visible fire extinguisher in the store?", answer: null, comment: "", images: [] },
  { id: 2, text: "Are emergency exits clearly marked and unobstructed?", answer: null, comment: "", images: [] },
  { id: 3, text: "Is the first aid kit fully stocked and easily accessible?", answer: null, comment: "", images: [] },
  { id: 4, text: "Are all staff trained in emergency procedures?", answer: null, comment: "", images: [] },
  { id: 5, text: "Are floor surfaces clean, dry and free of trip hazards?", answer: null, comment: "", images: [] },
  { id: 6, text: "Are all electrical cords and connections in good condition?", answer: null, comment: "", images: [] },
  { id: 7, text: "Is proper lifting technique being followed by employees?", answer: null, comment: "", images: [] },
  { id: 8, text: "Are security cameras functioning properly?", answer: null, comment: "", images: [] },
  { id: 9, text: "Is lighting adequate in all areas including parking?", answer: null, comment: "", images: [] },
  { id: 10, text: "Are shelves and displays safely arranged and secured?", answer: null, comment: "", images: [] },
  { id: 11, text: "Is there a lockout/tagout procedure for equipment maintenance?", answer: null, comment: "", images: [] },
  { id: 12, text: "Are hazardous materials properly labeled and stored?", answer: null, comment: "", images: [] },
  { id: 13, text: "Is PPE available and being used where required?", answer: null, comment: "", images: [] },
  { id: 14, text: "Are food safety protocols being followed (if applicable)?", answer: null, comment: "", images: [] },
  { id: 15, text: "Is there a documented cleaning schedule being followed?", answer: null, comment: "", images: [] },
  { id: 16, text: "Are waste disposal procedures properly implemented?", answer: null, comment: "", images: [] },
  { id: 17, text: "Is the HVAC system functioning properly?", answer: null, comment: "", images: [] },
  { id: 18, text: "Are employee break areas clean and safe?", answer: null, comment: "", images: [] },
  { id: 19, text: "Is there a working emergency communication system?", answer: null, comment: "", images: [] },
  { id: 20, text: "Are COVID-19 or other applicable health protocols being followed?", answer: null, comment: "", images: [] },
];

interface AssessmentContextType {
  assessment: Assessment | null;
  createNewAssessment: (storeName: string) => void;
  updateQuestion: (questionId: number, answer: AnswerType | null, comment: string, images: string[]) => void;
  calculateResults: () => AssessmentResult | null;
  completeAssessment: () => void;
  currentAssessment: Assessment | null;
  savedAssessments: Assessment[];
  loadAssessment: (assessmentId: string) => void;
}

const AssessmentContext = createContext<AssessmentContextType | undefined>(undefined);

export const AssessmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [savedAssessments, setSavedAssessments] = useState<Assessment[]>([]);
  const { user } = useAuth();
  
  // Create a new assessment 
  const createNewAssessment = (storeName: string) => {
    if (!user) {
      toast.error("You must be logged in to create an assessment");
      return;
    }
    
    const newAssessment: Assessment = {
      id: `assessment-${Date.now()}`,
      userId: user.id,
      storeName,
      date: new Date().toISOString(),
      questions: [...DEFAULT_QUESTIONS],
      score: null,
      completed: false,
    };
    
    setAssessment(newAssessment);
    toast.success(`New assessment for ${storeName} created`);
  };
  
  // Update a specific question
  const updateQuestion = (questionId: number, answer: AnswerType | null, comment: string, images: string[]) => {
    if (!assessment) return;
    
    const updatedQuestions = assessment.questions.map(q => 
      q.id === questionId ? { ...q, answer, comment, images } : q
    );
    
    setAssessment({
      ...assessment,
      questions: updatedQuestions,
    });
  };
  
  // Calculate assessment results
  const calculateResults = (): AssessmentResult | null => {
    if (!assessment) return null;
    
    const totalQuestions = assessment.questions.length;
    const applicableQuestions = assessment.questions.filter(q => q.answer !== 'na').length;
    const yesAnswers = assessment.questions.filter(q => q.answer === 'yes').length;
    
    const percentage = applicableQuestions > 0 
      ? Math.round((yesAnswers / applicableQuestions) * 100) 
      : 0;
      
    return {
      totalQuestions,
      applicableQuestions,
      yesAnswers,
      percentage,
    };
  };
  
  // Complete assessment
  const completeAssessment = () => {
    if (!assessment) return;
    
    const results = calculateResults();
    if (!results) return;
    
    const completedAssessment: Assessment = {
      ...assessment,
      score: results.percentage,
      completed: true,
    };
    
    // Add to saved assessments
    setSavedAssessments([...savedAssessments, completedAssessment]);
    
    // Update current assessment
    setAssessment(completedAssessment);
    
    toast.success(`Assessment completed with score: ${results.percentage}%`);
  };
  
  // Load a saved assessment
  const loadAssessment = (assessmentId: string) => {
    const found = savedAssessments.find(a => a.id === assessmentId);
    if (found) {
      setAssessment(found);
    }
  };
  
  return (
    <AssessmentContext.Provider
      value={{
        assessment,
        createNewAssessment,
        updateQuestion,
        calculateResults,
        completeAssessment,
        currentAssessment: assessment,
        savedAssessments,
        loadAssessment,
      }}
    >
      {children}
    </AssessmentContext.Provider>
  );
};

export const useAssessment = () => {
  const context = useContext(AssessmentContext);
  if (context === undefined) {
    throw new Error('useAssessment must be used within an AssessmentProvider');
  }
  return context;
};
