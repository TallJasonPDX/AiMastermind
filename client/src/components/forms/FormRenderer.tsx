// client/src/components/forms/FormRenderer.tsx

import React, { Suspense, lazy, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useFormSubmit } from '@/hooks/use-form-submit';
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
  
  // Get form components
  const formComponents: Record<string, React.ComponentType<any>> = {
    SubmitInterestForm: lazy(() => import('./SubmitInterestForm')),
    SubmitReconsiderationForm: lazy(() => import('./SubmitReconsiderationForm')),
  };
  
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
  
  // Check if we have a form component matching the form name
  const FormComponent = formComponents[formName];
  
  if (!FormComponent) {
    console.log(`Form not found: ${formName}`);
    return <FormNotFound formName={formName} />;
  }
  
  // Render the form component with Suspense for lazy loading
  return (
    <Suspense fallback={<div className="p-4 text-center">Loading form...</div>}>
      <FormComponent formSubmit={formSubmit} />
    </Suspense>
  );
}