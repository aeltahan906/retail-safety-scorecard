
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, HelpCircle, Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAssessment } from '@/contexts/AssessmentContext';

interface QuestionCardProps {
  id: string;
  questionNumber: number;
  questionText: string;
  answer: 'yes' | 'no' | 'n/a' | null;
  comment: string | null;
  images: string[];
  onUpdate: (answer: 'yes' | 'no' | 'n/a' | null, comment: string, images: string[]) => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  id,
  questionNumber,
  questionText,
  answer,
  comment,
  images,
  onUpdate
}) => {
  const [localComment, setLocalComment] = useState<string>(comment || '');
  const [localImages, setLocalImages] = useState<string[]>(images);
  const [isUploading, setIsUploading] = useState(false);
  
  const { uploadImage } = useAssessment();
  
  const handleAnswerChange = (value: 'yes' | 'no' | 'n/a') => {
    onUpdate(value, localComment, localImages);
  };
  
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalComment(e.target.value);
    onUpdate(answer, e.target.value, localImages);
  };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large. Please select an image under 5MB");
      return;
    }
    
    setIsUploading(true);
    
    try {
      const imageUrl = await uploadImage(file, id);
      if (imageUrl) {
        const updatedImages = [...localImages, imageUrl];
        setLocalImages(updatedImages);
        onUpdate(answer, localComment, updatedImages);
        toast.success("Image uploaded successfully");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
      // Reset the input so the same file can be selected again
      e.target.value = '';
    }
  };
  
  const removeImage = (urlToRemove: string) => {
    const updatedImages = localImages.filter(url => url !== urlToRemove);
    setLocalImages(updatedImages);
    onUpdate(answer, localComment, updatedImages);
    toast.success("Image removed");
  };
  
  const getAnswerColor = (answerValue: 'yes' | 'no' | 'n/a') => {
    if (answer !== answerValue) return "bg-white";
    
    switch (answerValue) {
      case 'yes': return "bg-green-50 text-green-600 border-green-300";
      case 'no': return "bg-red-50 text-red-600 border-red-300";
      case 'n/a': return "bg-gray-50 text-gray-600 border-gray-300";
      default: return "bg-white";
    }
  };
  
  return (
    <Card className="mb-6 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center space-x-2">
          <span className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">
            {questionNumber}
          </span>
          <span>{questionText}</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-0">
        <RadioGroup 
          value={answer || ''}
          onValueChange={(value) => handleAnswerChange(value as 'yes' | 'no' | 'n/a')}
          className="flex space-x-2"
        >
          <div className={`flex items-center space-x-1 border rounded-md px-3 py-2 ${getAnswerColor('yes')}`}>
            <RadioGroupItem value="yes" id={`yes-${id}`} />
            <Label htmlFor={`yes-${id}`} className="flex items-center cursor-pointer">
              <Check className="h-4 w-4 mr-1 text-green-600" />
              Yes
            </Label>
          </div>
          
          <div className={`flex items-center space-x-1 border rounded-md px-3 py-2 ${getAnswerColor('no')}`}>
            <RadioGroupItem value="no" id={`no-${id}`} />
            <Label htmlFor={`no-${id}`} className="flex items-center cursor-pointer">
              <X className="h-4 w-4 mr-1 text-red-500" />
              No
            </Label>
          </div>
          
          <div className={`flex items-center space-x-1 border rounded-md px-3 py-2 ${getAnswerColor('n/a')}`}>
            <RadioGroupItem value="n/a" id={`na-${id}`} />
            <Label htmlFor={`na-${id}`} className="flex items-center cursor-pointer">
              <HelpCircle className="h-4 w-4 mr-1 text-gray-500" />
              N/A
            </Label>
          </div>
        </RadioGroup>
        
        <div>
          <Label htmlFor={`comment-${id}`} className="text-sm">Comments</Label>
          <Textarea 
            id={`comment-${id}`} 
            placeholder="Add any relevant comments here" 
            value={localComment}
            onChange={handleCommentChange}
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor={`image-${id}`} className="text-sm block mb-2">
            Evidence Photos
          </Label>
          
          <div className="flex flex-wrap gap-2 mt-2 mb-4">
            {localImages.map((img, index) => (
              <div key={index} className="relative w-20 h-20 group">
                <img 
                  src={img} 
                  alt={`Evidence ${index + 1}`} 
                  className="w-full h-full object-cover rounded-md"
                />
                <Button 
                  variant="destructive" 
                  size="icon" 
                  className="w-5 h-5 absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage(img)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            
            <div className="w-20 h-20 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-blue-500 transition-colors">
              <label 
                htmlFor={`image-upload-${id}`} 
                className="cursor-pointer w-full h-full flex flex-col items-center justify-center"
              >
                {isUploading ? (
                  <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                ) : (
                  <>
                    <Camera className="h-6 w-6 text-gray-400" />
                    <span className="text-xs text-gray-500 mt-1">Add Photo</span>
                  </>
                )}
              </label>
              <input 
                id={`image-upload-${id}`}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isUploading}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuestionCard;
