
import React, { createContext, useContext, useState } from 'react';
import { toast } from "sonner";
import { useAuth } from './AuthContext';
import { supabase } from "@/integrations/supabase/client";
import { 
  Assessment, 
  AssessmentQuestion, 
  QuestionImage, 
  AssessmentResult, 
  AssessmentWithQuestions,
  QuestionWithImages
} from '../types/database';
import { v4 as uuidv4 } from 'uuid';

// Define default questions
const DEFAULT_QUESTIONS = [
  "Is there a visible fire extinguisher in the store?",
  "Are emergency exits clearly marked and unobstructed?",
  "Is the first aid kit fully stocked and easily accessible?",
  "Are all staff trained in emergency procedures?",
  "Are floor surfaces clean, dry and free of trip hazards?",
  "Are all electrical cords and connections in good condition?",
  "Is proper lifting technique being followed by employees?",
  "Are security cameras functioning properly?",
  "Is lighting adequate in all areas including parking?",
  "Are shelves and displays safely arranged and secured?",
  "Is there a lockout/tagout procedure for equipment maintenance?",
  "Are hazardous materials properly labeled and stored?",
  "Is PPE available and being used where required?",
  "Are food safety protocols being followed (if applicable)?",
  "Is there a documented cleaning schedule being followed?",
  "Are waste disposal procedures properly implemented?",
  "Is the HVAC system functioning properly?",
  "Are employee break areas clean and safe?",
  "Is there a working emergency communication system?",
  "Are COVID-19 or other applicable health protocols being followed?"
];

interface AssessmentContextType {
  currentAssessment: AssessmentWithQuestions | null;
  savedAssessments: AssessmentWithQuestions[];
  loading: boolean;
  fetchAssessments: () => Promise<void>;
  createNewAssessment: (storeName: string) => Promise<void>;
  updateQuestion: (questionId: string, answer: 'yes' | 'no' | 'n/a' | null, comment: string, images: string[]) => Promise<void>;
  calculateResults: () => AssessmentResult | null;
  completeAssessment: () => Promise<void>;
  loadAssessment: (assessmentId: string) => Promise<void>;
  uploadImage: (file: File, questionId: string) => Promise<string | null>;
}

const AssessmentContext = createContext<AssessmentContextType | undefined>(undefined);

export const AssessmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentAssessment, setCurrentAssessment] = useState<AssessmentWithQuestions | null>(null);
  const [savedAssessments, setSavedAssessments] = useState<AssessmentWithQuestions[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  
  // Fetch user's assessments
  const fetchAssessments = async () => {
    if (!user) {
      toast.error("You must be logged in to view assessments");
      return;
    }
    
    setLoading(true);
    
    try {
      // Fetch assessments
      const { data: assessments, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (assessmentError) {
        throw assessmentError;
      }
      
      if (!assessments || assessments.length === 0) {
        setSavedAssessments([]);
        setLoading(false);
        return;
      }
      
      const assessmentsWithQuestions: AssessmentWithQuestions[] = [];
      
      // For each assessment, fetch its questions
      for (const assessment of assessments) {
        const { data: questions, error: questionsError } = await supabase
          .from('assessment_questions')
          .select('*')
          .eq('assessment_id', assessment.id)
          .order('question_number', { ascending: true });
        
        if (questionsError) {
          console.error("Error fetching questions:", questionsError);
          continue;
        }
        
        // For each question, fetch its images
        const questionsWithImages: QuestionWithImages[] = [];
        
        for (const question of questions || []) {
          const { data: images, error: imagesError } = await supabase
            .from('question_images')
            .select('image_url')
            .eq('question_id', question.id);
          
          if (imagesError) {
            console.error("Error fetching images:", imagesError);
            questionsWithImages.push({
              ...question,
              images: []
            });
            continue;
          }
          
          questionsWithImages.push({
            ...question,
            images: images ? images.map(img => img.image_url) : []
          });
        }
        
        assessmentsWithQuestions.push({
          ...assessment,
          questions: questionsWithImages
        });
      }
      
      setSavedAssessments(assessmentsWithQuestions);
    } catch (error) {
      console.error("Error fetching assessments:", error);
      toast.error("Failed to load assessments");
    } finally {
      setLoading(false);
    }
  };
  
  // Create a new assessment 
  const createNewAssessment = async (storeName: string) => {
    if (!user) {
      toast.error("You must be logged in to create an assessment");
      return;
    }
    
    setLoading(true);
    
    try {
      // Create assessment in database
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .insert([{
          user_id: user.id,
          store_name: storeName,
          date: new Date().toISOString(),
          completed: false
        }])
        .select()
        .single();
      
      if (assessmentError) {
        throw assessmentError;
      }
      
      // Create questions for the assessment
      const questionsToInsert = DEFAULT_QUESTIONS.map((text, index) => ({
        assessment_id: assessment.id,
        question_number: index + 1,
        question_text: text,
        answer: null,
        comment: null
      }));
      
      const { data: questions, error: questionsError } = await supabase
        .from('assessment_questions')
        .insert(questionsToInsert)
        .select();
      
      if (questionsError) {
        throw questionsError;
      }
      
      // Set current assessment
      setCurrentAssessment({
        ...assessment,
        questions: questions.map(q => ({ ...q, images: [] }))
      });
      
      toast.success(`New assessment for ${storeName} created`);
    } catch (error: any) {
      console.error("Error creating assessment:", error);
      toast.error(error.message || "Failed to create assessment");
    } finally {
      setLoading(false);
    }
  };
  
  // Upload image to Supabase storage
  const uploadImage = async (file: File, questionId: string): Promise<string | null> => {
    if (!user) {
      toast.error("You must be logged in to upload images");
      return null;
    }
    
    try {
      // Generate a unique filename to avoid collisions
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${user.id}/${questionId}/${fileName}`;
      
      // Upload the file to storage
      const { error: uploadError } = await supabase.storage
        .from('assessment-images')
        .upload(filePath, file);
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Get the public URL for the file
      const { data: urlData } = supabase.storage
        .from('assessment-images')
        .getPublicUrl(filePath);
      
      if (!urlData || !urlData.publicUrl) {
        throw new Error("Failed to get public URL");
      }
      
      // Insert image record in database
      const { error: insertError } = await supabase
        .from('question_images')
        .insert([{
          question_id: questionId,
          image_url: urlData.publicUrl
        }]);
      
      if (insertError) {
        throw insertError;
      }
      
      return urlData.publicUrl;
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(error.message || "Failed to upload image");
      return null;
    }
  };
  
  // Update a specific question
  const updateQuestion = async (
    questionId: string, 
    answer: 'yes' | 'no' | 'n/a' | null, 
    comment: string, 
    images: string[]
  ) => {
    if (!currentAssessment) return;
    
    try {
      // Update question in database
      const { error } = await supabase
        .from('assessment_questions')
        .update({ 
          answer, 
          comment: comment || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', questionId);
      
      if (error) {
        throw error;
      }
      
      // Update local state
      setCurrentAssessment(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          questions: prev.questions.map(q => 
            q.id === questionId 
              ? { ...q, answer, comment, images } 
              : q
          )
        };
      });
    } catch (error: any) {
      console.error("Error updating question:", error);
      toast.error(error.message || "Failed to update question");
    }
  };
  
  // Calculate assessment results
  const calculateResults = (): AssessmentResult | null => {
    if (!currentAssessment) return null;
    
    const totalQuestions = currentAssessment.questions.length;
    const applicableQuestions = currentAssessment.questions.filter(q => q.answer !== 'n/a' && q.answer !== null).length;
    const yesAnswers = currentAssessment.questions.filter(q => q.answer === 'yes').length;
    
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
  const completeAssessment = async () => {
    if (!currentAssessment) return;
    
    try {
      const results = calculateResults();
      if (!results) return;
      
      // Update assessment in database
      const { error } = await supabase
        .from('assessments')
        .update({ 
          completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentAssessment.id);
      
      if (error) {
        throw error;
      }
      
      // Update local state
      setCurrentAssessment({
        ...currentAssessment,
        completed: true
      });
      
      // Fetch updated assessments
      await fetchAssessments();
      
      toast.success(`Assessment completed with score: ${results.percentage}%`);
    } catch (error: any) {
      console.error("Error completing assessment:", error);
      toast.error(error.message || "Failed to complete assessment");
    }
  };
  
  // Load a saved assessment
  const loadAssessment = async (assessmentId: string) => {
    setLoading(true);
    
    try {
      // Find assessment in saved assessments
      const existingAssessment = savedAssessments.find(a => a.id === assessmentId);
      if (existingAssessment) {
        setCurrentAssessment(existingAssessment);
        setLoading(false);
        return;
      }
      
      // If not found in local state, fetch from database
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();
      
      if (assessmentError) {
        throw assessmentError;
      }
      
      // Fetch questions
      const { data: questions, error: questionsError } = await supabase
        .from('assessment_questions')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('question_number', { ascending: true });
      
      if (questionsError) {
        throw questionsError;
      }
      
      // Fetch images for each question
      const questionsWithImages: QuestionWithImages[] = [];
      
      for (const question of questions || []) {
        const { data: images, error: imagesError } = await supabase
          .from('question_images')
          .select('image_url')
          .eq('question_id', question.id);
        
        if (imagesError) {
          console.error("Error fetching images:", imagesError);
          questionsWithImages.push({
            ...question,
            images: []
          });
          continue;
        }
        
        questionsWithImages.push({
          ...question,
          images: images ? images.map(img => img.image_url) : []
        });
      }
      
      setCurrentAssessment({
        ...assessment,
        questions: questionsWithImages
      });
    } catch (error: any) {
      console.error("Error loading assessment:", error);
      toast.error(error.message || "Failed to load assessment");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <AssessmentContext.Provider
      value={{
        currentAssessment,
        savedAssessments,
        loading,
        fetchAssessments,
        createNewAssessment,
        updateQuestion,
        calculateResults,
        completeAssessment,
        loadAssessment,
        uploadImage
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
