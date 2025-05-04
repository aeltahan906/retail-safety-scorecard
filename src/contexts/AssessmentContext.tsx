
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
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  
  // Create a new assessment with default questions
  const createNewAssessment = async (storeName: string) => {
    if (!user) {
      toast.error('User is not logged in. Please log in to create an assessment.');
      return;
    }
    
    try {
      setLoading(true); // Indicate loading state
      setError(null);

      // Create the assessment
      const assessment = await createAssessment(storeName, user.id);
      
      if (!assessment) {
        toast.error('Failed to create assessment. Please try again.');
        return;
      }
      
      console.log("Created assessment:", assessment);
      
      // Create questions for the assessment
      const questions = await createQuestionsForAssessment(assessment.id);
      
      if (!questions) {
        toast.error('Failed to create assessment questions. Rolling back assessment creation.');
        // Rollback logic would go here
        return;
      }
      
      console.log("Created questions:", questions.length);
      
      // Set as current assessment
      const newAssessment: AssessmentWithQuestions = {
        ...assessment,
        questions
      };
      
      setCurrentAssessment(newAssessment);
      
      // Add to saved assessments list
      setSavedAssessments(prev => [newAssessment, ...prev]);
      
      toast.success('Assessment created successfully');
    } catch (error: any) {
      console.error('Error in createNewAssessment:', error);
      setError(error.message || 'An unexpected error occurred');
      toast.error('An unexpected error occurred while creating the assessment.');
    } finally {
      setLoading(false); // End loading state
    }
  };
  
  // Fetch all assessments for the current user
  const fetchAssessments = async () => {
    if (!user) {
      console.log('User is not logged in. Unable to fetch assessments.');
      setLoading(false);
      setError('User not logged in');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log("Fetching assessments for user:", user.id);
      const assessmentsData = await fetchAssessmentsForUser(user.id);
      console.log("Fetched assessments:", assessmentsData.length);
      setSavedAssessments(assessmentsData);
    } catch (error: any) {
      console.error('Error in fetchAssessments:', error);
      setError(error.message || 'Failed to fetch assessments');
      toast.error('Failed to fetch assessments. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };
  
  // Load an existing assessment
  const loadAssessment = async (assessmentId: string) => {
    if (!user) {
      toast.error('User is not logged in. Unable to load assessment.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("Loading assessment:", assessmentId);
      const assessment = await loadAssessmentById(assessmentId);
      
      if (assessment) {
        console.log("Assessment loaded successfully:", assessment.id);
        setCurrentAssessment(assessment);
        toast.success('Assessment loaded successfully');
      } else {
        console.error("Failed to load assessment:", assessmentId);
        setError('Failed to load assessment');
        toast.error('Failed to load assessment. Please try again.');
      }
    } catch (error: any) {
      console.error('Error in loadAssessment:', error);
      setError(error.message || 'Failed to load assessment');
      toast.error('An error occurred while loading the assessment.');
    } finally {
      setLoading(false);
    }
  };
  
  // Update a question's answer, comment, and images
  const updateQuestion = async (questionId: string, answer: 'yes' | 'no' | 'n/a' | null, comment: string | null, images: string[]) => {
    if (!currentAssessment) {
      toast.error('No assessment is currently loaded.');
      return;
    }
    
    // Update local state first
    const updatedQuestions = currentAssessment.questions.map(q => 
      q.id === questionId ? { ...q, answer, comment, images } : q
    );
    
    setCurrentAssessment({
      ...currentAssessment,
      questions: updatedQuestions
    });

    try {
      // Update database
      const success = await updateQuestionInDb(questionId, answer, comment);
      if (!success) {
        console.error("Failed to update question in database:", questionId);
        throw new Error('Database update failed');
      }
    } catch (error: any) {
      console.error('Error in updateQuestion:', error);
      setError(error.message || 'Failed to save question');
      toast.error('Failed to save the question update. Please try again.');
    }
  };
  
  // Mark an assessment as complete
  const completeAssessment = async () => {
    if (!currentAssessment) {
      toast.error('No assessment is currently loaded.');
      return;
    }
    
    try {
      const success = await markAssessmentComplete(currentAssessment.id);
      
      if (success) {
        setCurrentAssessment({
          ...currentAssessment,
          completed: true
        });
        
        // Update in the saved assessments list
        setSavedAssessments(prevAssessments => 
          prevAssessments.map(a => 
            a.id === currentAssessment.id ? { ...a, completed: true } : a
          )
        );
        
        toast.success('Assessment completed successfully');
      } else {
        setError('Failed to mark assessment as complete');
        toast.error('Failed to mark the assessment as complete.');
      }
    } catch (error: any) {
      console.error('Error in completeAssessment:', error);
      setError(error.message || 'Failed to complete assessment');
      toast.error('An unexpected error occurred while completing the assessment.');
    }
  };
  
  // Calculate assessment results
  const calculateResults = (): AssessmentResult => {
    if (!currentAssessment) {
      toast.error('No assessment is currently loaded.');
      throw new Error('Cannot calculate results without a loaded assessment.');
    }
    return calculateAssessmentResults(currentAssessment);
  };
  
  // Upload an image for a question
  const uploadImage = async (file: File, questionId: string): Promise<string | null> => {
    if (!currentAssessment || !user) {
      toast.error('Cannot upload image. Please check your login and assessment status.');
      return null;
    }

    try {
      const imageUrl = await uploadImageForQuestion(file, questionId, user.id, currentAssessment.id);
      if (imageUrl) {
        toast.success('Image uploaded successfully.');
        return imageUrl;
      } else {
        throw new Error('Image upload failed');
      }
    } catch (error: any) {
      console.error('Error in uploadImage:', error);
      setError(error.message || 'Failed to upload image');
      toast.error('Failed to upload the image. Please try again.');
      return null;
    }
  };
  
  // Effect to fetch assessments when user changes or when logged in
  useEffect(() => {
    console.log("AssessmentContext useEffect triggered - User:", user?.id);
    if (user) {
      fetchAssessments();
    } else {
      setSavedAssessments([]);
      setCurrentAssessment(null);
      setLoading(false);
    }
  }, [user]);

  // Debug log when component renders
  useEffect(() => {
    console.log("AssessmentContext rendered - Loading:", loading, "User:", user?.id);
    console.log("Current assessment:", currentAssessment?.id);
    console.log("Saved assessments:", savedAssessments.length);
  }, [loading, user, currentAssessment, savedAssessments.length]);

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
        if (!user) {
          toast.error('User is not logged in. Unable to create an assessment.');
          return null;
        }
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
