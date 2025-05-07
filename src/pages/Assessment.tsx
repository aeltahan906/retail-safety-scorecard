
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import { createNewAssessment } from '@/features/assessment/api';

const Assessment = () => {
  const [storeName, setStoreName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  // We need to make the handleCreateAssessment function async
  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!storeName.trim()) {
      toast.error("Please enter a store name");
      return;
    }
    
    setIsCreating(true);
    
    try {
      await createNewAssessment(storeName);
      setCurrentPage(0); // Reset to first page
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div>
      <h1>Assessment Page</h1>
      {/* Your assessment page content here */}
    </div>
  );
};

export default Assessment;
