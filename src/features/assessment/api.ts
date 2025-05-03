
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { Assessment, AssessmentQuestion } from '@/types/database';
import { AssessmentWithQuestions } from './types';
import { DEFAULT_QUESTIONS } from './constants';
import type { TablesInsert } from '@/integrations/supabase/types';

// Create a new assessment in the database
export const createAssessment = async (storeName: string, userId: string): Promise<Assessment | null> => {
  const newAssessment: TablesInsert<"assessments"> = {
    store_name: storeName,
    user_id: userId,
    date: new Date().toISOString(),
    completed: false
  };

  const { data, error } = await supabase
    .from('assessments')
    .insert(newAssessment)
    .select()
    .single();
    
  if (error || !data) {
    console.error('Error creating assessment:', error);
    toast.error('Failed to create assessment');
    return null;
  }
  
  return data as Assessment;
};

// Create questions for an assessment
export const createQuestionsForAssessment = async (assessmentId: string): Promise<AssessmentQuestion[] | null> => {
  const questionsToInsert = DEFAULT_QUESTIONS.map((q) => ({
    assessment_id: assessmentId,
    question_number: q.question_number,
    question_text: q.question_text,
    answer: null,
    comment: null
  } as TablesInsert<"assessment_questions">));
  
  const { data: questionsData, error: questionsError } = await supabase
    .from('assessment_questions')
    .insert(questionsToInsert)
    .select();
    
  if (questionsError || !questionsData) {
    console.error('Error creating questions:', questionsError);
    toast.error('Failed to create assessment questions');
    return null;
  }
  
  return questionsData.map((q) => ({
    ...q as any, // Using any to bypass spread type error
    images: [] as string[],
    answer: q.answer as 'yes' | 'no' | 'n/a' | null
  })) as AssessmentQuestion[];
};

// Fetch all assessments for a user
export const fetchAssessmentsForUser = async (userId: string): Promise<AssessmentWithQuestions[]> => {
  try {
    // Fetch assessments
    const { data: assessmentsData, error: assessmentsError } = await supabase
      .from('assessments')
      .select('*')
      .eq('user_id', userId as any)
      .order('created_at', { ascending: false });
      
    if (assessmentsError || !assessmentsData) {
      console.error('Error fetching assessments:', assessmentsError);
      toast.error('Failed to load assessments');
      return [];
    }
    
    // Fetch questions for each assessment
    const assessmentsWithQuestions: AssessmentWithQuestions[] = [];
    
    for (const assessment of assessmentsData) {
      const { data: questionsData, error: questionsError } = await supabase
        .from('assessment_questions')
        .select('*')
        .eq('assessment_id', assessment.id as any);
        
      if (questionsError || !questionsData) {
        console.error('Error fetching questions:', questionsError);
        continue;
      }
      
      // Fetch images for each question
      const questionsWithImages = await Promise.all(questionsData.map(async (question) => {
        if (!question) return null;
        
        const { data: imagesData, error: imagesError } = await supabase
          .from('question_images')
          .select('image_url')
          .eq('question_id', question.id as any);
          
        if (imagesError || !imagesData) {
          return { 
            ...question as any, // Using any to bypass spread type error
            images: [],
            answer: question.answer as 'yes' | 'no' | 'n/a' | null 
          };
        }
        
        const images = imagesData.map(img => img.image_url);
        return { 
          ...question as any, // Using any to bypass spread type error
          images, 
          answer: question.answer as 'yes' | 'no' | 'n/a' | null 
        };
      }));
      
      // Filter out any null questions
      const validQuestions = questionsWithImages.filter(q => q !== null) as AssessmentQuestion[];
      
      assessmentsWithQuestions.push({
        ...assessment as any, // Using any to bypass spread type error
        questions: validQuestions
      });
    }
    
    return assessmentsWithQuestions;
  } catch (error) {
    console.error('Error in fetchAssessments:', error);
    return [];
  }
};

// Load a specific assessment
export const loadAssessmentById = async (assessmentId: string): Promise<AssessmentWithQuestions | null> => {
  try {
    const { data: assessmentData, error: assessmentError } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', assessmentId as any)
      .single();
      
    if (assessmentError || !assessmentData) {
      console.error('Error loading assessment:', assessmentError);
      toast.error('Failed to load assessment');
      return null;
    }
    
    const { data: questionsData, error: questionsError } = await supabase
      .from('assessment_questions')
      .select('*')
      .eq('assessment_id', assessmentId as any);
      
    if (questionsError || !questionsData) {
      console.error('Error loading questions:', questionsError);
      toast.error('Failed to load assessment questions');
      return null;
    }
    
    // Fetch images for each question
    const questionsWithImages = await Promise.all(questionsData.map(async (question) => {
      if (!question) return null;
      
      const { data: imagesData, error: imagesError } = await supabase
        .from('question_images')
        .select('image_url')
        .eq('question_id', question.id as any);
        
      if (imagesError || !imagesData) {
        return { 
          ...question as any, // Using any to bypass spread type error
          images: [],
          answer: question.answer as 'yes' | 'no' | 'n/a' | null 
        };
      }
      
      const images = imagesData.map(img => img.image_url || '');
      return { 
        ...question as any, // Using any to bypass spread type error
        images,
        answer: question.answer as 'yes' | 'no' | 'n/a' | null 
      };
    }));
    
    // Filter out any null questions
    const validQuestions = questionsWithImages.filter(q => q !== null) as AssessmentQuestion[];
    
    return {
      ...assessmentData as any, // Using any to bypass spread type error
      questions: validQuestions
    };
  } catch (error) {
    console.error('Error in loadAssessment:', error);
    return null;
  }
};

// Update a question
export const updateQuestionInDb = async (
  questionId: string, 
  answer: 'yes' | 'no' | 'n/a' | null, 
  comment: string | null
): Promise<boolean> => {
  try {
    const updateData: TablesInsert<"assessment_questions"> = { 
      answer: answer as string | null, 
      comment 
    };
    
    const { error } = await supabase
      .from('assessment_questions')
      .update(updateData)
      .eq('id', questionId);
      
    if (error) {
      console.error('Error updating question:', error);
      toast.error('Failed to save answer');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateQuestion:', error);
    return false;
  }
};

// Complete an assessment
export const markAssessmentComplete = async (assessmentId: string): Promise<boolean> => {
  try {
    const updateData: TablesInsert<"assessments"> = { completed: true };
    
    const { error } = await supabase
      .from('assessments')
      .update(updateData)
      .eq('id', assessmentId);
      
    if (error) {
      console.error('Error completing assessment:', error);
      toast.error('Failed to complete assessment');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in completeAssessment:', error);
    return false;
  }
};

// Upload an image
export const uploadImageForQuestion = async (
  file: File, 
  questionId: string, 
  userId: string, 
  assessmentId: string
): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${userId}/${assessmentId}/${questionId}/${fileName}`;
    
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
    const imageData: TablesInsert<"question_images"> = {
      question_id: questionId,
      image_url: urlData.publicUrl
    };
    
    const { error: saveError } = await supabase
      .from('question_images')
      .insert(imageData);
      
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
