
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { Assessment, AssessmentQuestion, AssessmentResult } from '@/types/database';
import { 
  AssessmentWithQuestions, 
  AssessmentContextType 
} from '@/features/assessment/types';
import {
  createAssessment,
  createQuestionsForAssessment,
  fetchAssessmentsForUser,
  loadAssessmentById,
  updateQuestionInDb,
  markAssessmentComplete,
  uploadImageForQuestion
} from '@/features/assessment/api';
import { calculateAssessmentResults } from '@/features/assessment/utils';

const AssessmentContext = createContext<AssessmentContextType | undefined>(undefined);

export const AssessmentProvider = ({ children }: { children: ReactNode }) => {
  const [currentAssessment, setCurrentAssessment] = useState<AssessmentWithQuestions | null>(null);
  const [savedAssessments, setSavedAssessments] = useState<AssessmentWithQuestions[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  // Create a new assessment with default questions
  const createNewAssessment = async (storeName: string) => {
    if (!user) return;
    
    try {
      // Create the assessment
      const assessment = await createAssessment(storeName, user.id);
      
      if (!assessment) {
        toast.error('Failed to create assessment');
        return;
      }
      
      // Create questions for the assessment
      const questions = await createQuestionsForAssessment(assessment.id);
      
      if (!questions) {
        toast.error('Failed to create assessment questions');
        return;
      }
      
      // Set as current assessment
      setCurrentAssessment({
        ...assessment,
        questions
      });
      
      toast.success('Assessment created successfully');
    } catch (error) {
      console.error('Error in createNewAssessment:', error);
      toast.error('Failed to create assessment');
    }
  };
  
  // Fetch all assessments for the current user
  const fetchAssessments = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    try {
      const assessmentsData = await fetchAssessmentsForUser(user.id);
      setSavedAssessments(assessmentsData);
    } catch (error) {
      console.error('Error in fetchAssessments:', error);
      toast.error('Failed to fetch assessments');
    } finally {
      setLoading(false);
    }
  };
  
  // Load an existing assessment
  const loadAssessment = async (assessmentId: string) => {
    try {
      const assessment = await loadAssessmentById(assessmentId);
      
      if (assessment) {
        setCurrentAssessment(assessment);
        toast.success('Assessment loaded');
      }
    } catch (error) {
      console.error('Error in loadAssessment:', error);
      toast.error('Failed to load assessment');
    }
  };
  
  // Update a question's answer, comment, and images
  const updateQuestion = (questionId: string, answer: 'yes' | 'no' | 'n/a' | null, comment: string | null, images: string[]) => {
    if (!currentAssessment) return;
    
    // Update local state first
    const updatedQuestions = currentAssessment.questions.map(q => 
      q.id === questionId ? { ...q, answer, comment, images } : q
    );
    
    setCurrentAssessment({
      ...currentAssessment,
      questions: updatedQuestions
    });
    
    // Update database
    updateQuestionInDb(questionId, answer, comment);
  };
  
  // Mark an assessment as complete
  const completeAssessment = async () => {
    if (!currentAssessment) return;
    
    try {
      const success = await markAssessmentComplete(currentAssessment.id);
      
      if (success) {
        setCurrentAssessment({
          ...currentAssessment,
          completed: true
        });
        
        toast.success('Assessment completed successfully');
      }
    } catch (error) {
      console.error('Error in completeAssessment:', error);
      toast.error('Failed to complete assessment');
    }
  };
  
  // Calculate assessment results
  const calculateResults = (): AssessmentResult => {
    return calculateAssessmentResults(currentAssessment);
  };
  
  // Upload an image for a question
  const uploadImage = async (file: File, questionId: string): Promise<string | null> => {
    if (!currentAssessment || !user) return null;
    return uploadImageForQuestion(file, questionId, user.id, currentAssessment.id);
  };
  
  // Effect to fetch assessments when user changes
  useEffect(() => {
    if (user) {
      fetchAssessments();
    } else {
      setSavedAssessments([]);
      setCurrentAssessment(null);
      setLoading(false);
    }
  }, [user]);

  return (
    <AssessmentContext.Provider value={{ 
      currentAssessment, 
      savedAssessments,
      loading,
      fetchAssessments,
      createNewAssessment, 
      updateQuestion, 
      calculateResults,
      loadAssessment,
      completeAssessment,
      uploadImage,
      createAssessment: async (storeName: string) => {
        if (!user) return null;
        return createAssessment(storeName, user.id);
      }
    }}>
      {children}
    </AssessmentContext.Provider>
  );
};

export const useAssessment = () => {
  const context = useContext(AssessmentContext);
  if (!context) {
    throw new Error('useAssessment must be used within an AssessmentProvider');
  }
  return context;
};
