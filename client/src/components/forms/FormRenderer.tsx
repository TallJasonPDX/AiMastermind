// client/src/components/forms/FormRenderer.tsx

import React, { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useFormSubmit } from '@/hooks/use-form-submit';
import SubmitInterestForm from './SubmitInterestForm';
import SubmitReconsiderationForm from './SubmitReconsiderationForm';
import FormNotFound from './FormNotFound';

// Props interface for the form renderer
interface FormRendererProps {
  formName: string | null | undefined;
  onSubmitSuccess?: () => void;
}

/**
 * A component that renders different forms based on the provided formName
 * @param formName The name/identifier of the form to render
 * @param onSubmitSuccess Optional callback for when a form is successfully submitted
 */
export default function FormRenderer({ formName, onSubmitSuccess }: FormRendererProps) {
  const { toast } = useToast();
  
  // If no form name is provided, don't render anything
  if (!formName) {
    return null;
  }
  
  // Initialize form submission hook with appropriate form name
  const formSubmit = useFormSubmit(formName, {
    onSuccess: (data) => {
      // Show a success toast
      toast({
        title: "Form submitted successfully",
        description: "Thank you for your submission.",
        duration: 5000,
      });
      
      // Call the optional success callback
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    },
    onError: (error) => {
      // Show an error toast
      toast({
        title: "Error submitting form",
        description: error.message || "Please try again later.",
        variant: "destructive",
        duration: 5000,
      });
    }
  });
  
  // Render the appropriate form based on the form name
  switch (formName) {
    case 'interest':
      return <SubmitInterestForm formSubmit={formSubmit} />;
    
    case 'reconsideration':
      return <SubmitReconsiderationForm formSubmit={formSubmit} />;
    
    default:
      // If no matching form is found, render a fallback component
      return <FormNotFound formName={formName} />;
  }
}