
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { Assessment, AssessmentQuestion, AssessmentWithQuestions, AssessmentResult } from '@/types/database';
import { Database } from '@/integrations/supabase/types';

// Default questions for a new assessment
const DEFAULT_QUESTIONS = [
  { question_number: 1, question_text: "Are all fire extinguishers properly maintained and accessible?" },
  { question_number: 2, question_text: "Is the emergency evacuation plan clearly displayed?" },
  { question_number: 3, question_text: "Are all emergency exits properly marked and unobstructed?" },
  { question_number: 4, question_text: "Is proper PPE available and used where required?" },
  { question_number: 5, question_text: "Are all hazardous materials properly labeled and stored?" },
  { question_number: 6, question_text: "Is the first aid kit fully stocked and easily accessible?" },
  { question_number: 7, question_text: "Are all electrical panels and equipment in good condition?" },
  { question_number: 8, question_text: "Are all walkways and work areas free of slip, trip, and fall hazards?" },
  { question_number: 9, question_text: "Is the lighting adequate in all work areas?" },
  { question_number: 10, question_text: "Are all employees trained in safety procedures?" },
  { question_number: 11, question_text: "Are safety data sheets (SDS) available for all chemicals?" },
  { question_number: 12, question_text: "Is proper lifting technique being followed for manual handling?" },
  { question_number: 13, question_text: "Are all tools and machinery properly maintained?" },
  { question_number: 14, question_text: "Is there adequate ventilation in work areas?" },
  { question_number: 15, question_text: "Are noise levels controlled where necessary?" },
  { question_number: 16, question_text: "Are COVID-19 safety measures being followed?" },
  { question_number: 17, question_text: "Are all safety signs visible and in good condition?" },
  { question_number: 18, question_text: "Are regular safety meetings conducted?" },
  { question_number: 19, question_text: "Is there a process for reporting safety concerns?" },
  { question_number: 20, question_text: "Are safety inspections conducted regularly?" }
];

type AssessmentContextType = {
  currentAssessment: AssessmentWithQuestions | null;
  savedAssessments: AssessmentWithQuestions[];
  loading: boolean;
  fetchAssessments: () => Promise<void>;
  createNewAssessment: (storeName: string) => Promise<void>;
  updateQuestion: (questionId: string, answer: 'yes' | 'no' | 'n/a' | null, comment: string | null, images: string[]) => void;
  calculateResults: () => AssessmentResult;
  loadAssessment: (assessmentId: string) => Promise<void>;
  completeAssessment: () => Promise<void>;
  uploadImage: (file: File, questionId: string) => Promise<string | null>;
  createAssessment: (storeName: string) => Promise<Assessment>;
};

const AssessmentContext = createContext<AssessmentContextType | undefined>(undefined);

export const AssessmentProvider = ({ children }: { children: ReactNode }) => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [currentAssessment, setCurrentAssessment] = useState<AssessmentWithQuestions | null>(null);
  const [savedAssessments, setSavedAssessments] = useState<AssessmentWithQuestions[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Create a new assessment in the database
  const createAssessment = async (storeName: string): Promise<Assessment> => {
    if (!user) {
      throw new Error('User is not authenticated');
    }

    const { data, error } = await supabase
      .from('assessments')
      .insert({ 
        store_name: storeName,
        user_id: user.id,
        date: new Date().toISOString(),
        completed: false
      })
      .select()
      .single();
      
    if (error || !data) {
      console.error('Error creating assessment:', error);
      toast.error('Failed to create assessment');
      throw error;
    }
    
    return data as Assessment;
  };
  
  // Fetch all assessments for the current user
  const fetchAssessments = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    try {
      // Fetch assessments
      const { data: assessmentsData, error: assessmentsError } = await supabase
        .from('assessments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (assessmentsError || !assessmentsData) {
        console.error('Error fetching assessments:', assessmentsError);
        toast.error('Failed to load assessments');
        return;
      }
      
      // Fetch questions for each assessment
      const assessmentsWithQuestions: AssessmentWithQuestions[] = [];
      
      for (const assessment of assessmentsData) {
        const { data: questionsData, error: questionsError } = await supabase
          .from('assessment_questions')
          .select('*')
          .eq('assessment_id', assessment.id);
          
        if (questionsError || !questionsData) {
          console.error('Error fetching questions:', questionsError);
          continue;
        }
        
        // Fetch images for each question
        const questionsWithImages = await Promise.all(questionsData.map(async (question) => {
          const { data: imagesData, error: imagesError } = await supabase
            .from('question_images')
            .select('image_url')
            .eq('question_id', question.id);
            
          if (imagesError || !imagesData) {
            console.error('Error fetching images:', imagesError);
            return { 
              ...question, 
              images: [],
              answer: question.answer as 'yes' | 'no' | 'n/a' | null 
            };
          }
          
          const images = imagesData.map(img => img.image_url);
          return { 
            ...question, 
            images, 
            answer: question.answer as 'yes' | 'no' | 'n/a' | null 
          };
        }));
        
        assessmentsWithQuestions.push({
          ...assessment,
          questions: questionsWithImages as AssessmentQuestion[]
        });
      }
      
      setSavedAssessments(assessmentsWithQuestions);
    } catch (error) {
      console.error('Error in fetchAssessments:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Create a new assessment with default questions
  const createNewAssessment = async (storeName: string) => {
    if (!user) return;
    
    try {
      // Create the assessment
      const assessment = await createAssessment(storeName);
      
      // Create questions for the assessment
      const questionsToInsert = DEFAULT_QUESTIONS.map((q) => ({
        assessment_id: assessment.id,
        question_number: q.question_number,
        question_text: q.question_text,
        answer: null,
        comment: null
      }));
      
      const { data: questionsData, error: questionsError } = await supabase
        .from('assessment_questions')
        .insert(questionsToInsert)
        .select();
        
      if (questionsError || !questionsData) {
        console.error('Error creating questions:', questionsError);
        toast.error('Failed to create assessment questions');
        return;
      }
      
      const questionsWithImages = questionsData.map((q) => ({
        ...q, 
        images: [] as string[],
        answer: q.answer as 'yes' | 'no' | 'n/a' | null
      }));
      
      // Set as current assessment
      setCurrentAssessment({
        ...assessment,
        questions: questionsWithImages as AssessmentQuestion[]
      });
      
      toast.success('Assessment created successfully');
    } catch (error) {
      console.error('Error in createNewAssessment:', error);
    }
  };
  
  // Load an existing assessment
  const loadAssessment = async (assessmentId: string) => {
    try {
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();
        
      if (assessmentError || !assessmentData) {
        console.error('Error loading assessment:', assessmentError);
        toast.error('Failed to load assessment');
        return;
      }
      
      const { data: questionsData, error: questionsError } = await supabase
        .from('assessment_questions')
        .select('*')
        .eq('assessment_id', assessmentId);
        
      if (questionsError || !questionsData) {
        console.error('Error loading questions:', questionsError);
        toast.error('Failed to load assessment questions');
        return;
      }
      
      // Fetch images for each question
      const questionsWithImages = await Promise.all(questionsData.map(async (question) => {
        const { data: imagesData, error: imagesError } = await supabase
          .from('question_images')
          .select('image_url')
          .eq('question_id', question.id);
          
        if (imagesError || !imagesData) {
          console.error('Error fetching images:', imagesError);
          return { 
            ...question, 
            images: [],
            answer: question.answer as 'yes' | 'no' | 'n/a' | null 
          };
        }
        
        const images = imagesData.map(img => img.image_url);
        return { 
          ...question, 
          images,
          answer: question.answer as 'yes' | 'no' | 'n/a' | null 
        };
      }));
      
      setCurrentAssessment({
        ...assessmentData,
        questions: questionsWithImages as AssessmentQuestion[]
      });
      
      toast.success('Assessment loaded');
    } catch (error) {
      console.error('Error in loadAssessment:', error);
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
    supabase
      .from('assessment_questions')
      .update({ 
        answer: answer as string | null, 
        comment 
      })
      .eq('id', questionId)
      .then(({ error }) => {
        if (error) {
          console.error('Error updating question:', error);
          toast.error('Failed to save answer');
        }
      });
  };
  
  // Mark an assessment as complete
  const completeAssessment = async () => {
    if (!currentAssessment) return;
    
    try {
      const { error } = await supabase
        .from('assessments')
        .update({ completed: true })
        .eq('id', currentAssessment.id);
        
      if (error) {
        console.error('Error completing assessment:', error);
        toast.error('Failed to complete assessment');
        return;
      }
      
      setCurrentAssessment({
        ...currentAssessment,
        completed: true
      });
      
      toast.success('Assessment completed successfully');
    } catch (error) {
      console.error('Error in completeAssessment:', error);
    }
  };
  
  // Calculate assessment results
  const calculateResults = (): AssessmentResult => {
    if (!currentAssessment) {
      return { totalQuestions: 0, applicableQuestions: 0, yesAnswers: 0, percentage: 0 };
    }
    
    const totalQuestions = currentAssessment.questions.length;
    const applicableQuestions = currentAssessment.questions.filter(q => q.answer !== 'n/a').length;
    const yesAnswers = currentAssessment.questions.filter(q => q.answer === 'yes').length;
    
    const percentage = applicableQuestions > 0
      ? Math.round((yesAnswers / applicableQuestions) * 100)
      : 0;
      
    return {
      totalQuestions,
      applicableQuestions,
      yesAnswers,
      percentage
    };
  };
  
  // Upload an image for a question
  const uploadImage = async (file: File, questionId: string): Promise<string | null> => {
    if (!currentAssessment || !user) return null;
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${user.id}/${currentAssessment.id}/${questionId}/${fileName}`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('assessment-images')
        .upload(filePath, file);
        
      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        toast.error('Failed to upload image');
        return null;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('assessment-images')
        .getPublicUrl(filePath);
        
      if (!urlData || !urlData.publicUrl) {
        toast.error('Failed to get image URL');
        return null;
      }
      
      // Save to question_images table
      const { error: saveError } = await supabase
        .from('question_images')
        .insert({
          question_id: questionId,
          image_url: urlData.publicUrl
        });
        
      if (saveError) {
        console.error('Error saving image reference:', saveError);
        toast.error('Failed to save image reference');
        return null;
      }
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error in uploadImage:', error);
      return null;
    }
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
      createAssessment
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
