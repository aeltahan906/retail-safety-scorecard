import React, { useState } from 'react';
import { useAssessment } from '@/contexts/AssessmentContext'; // Import the custom hook

const Assessment = () => {
  const { createAssessment } = useAssessment(); // Destructure createAssessment from context
  const [storeName, setStoreName] = useState('');
  const [currentPage, setCurrentPage] = useState(0);

  const handleCreateAssessment = async () => {
    const assessment = await createAssessment(storeName);
    if (assessment) {
      console.log("Assessment created:", assessment);
      setCurrentPage(0); // Move to the first page of the assessment or do other actions
    } else {
      console.error("Failed to create assessment");
    }
  };

  return (
    <div>
      <input
        type="text"
        value={storeName}
        onChange={(e) => setStoreName(e.target.value)}
        placeholder="Enter store name"
      />
      <button onClick={handleCreateAssessment}>Create Assessment</button>
    </div>
  );
};

export default Assessment;
