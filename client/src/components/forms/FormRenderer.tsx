
// client/src/components/forms/FormRenderer.tsx

import React, { Suspense, lazy, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useFormSubmit } from '@/hooks/use-form-submit';
import FormNotFound from './FormNotFound';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

// Props interface for the form renderer
interface FormRendererProps {
  formName: string | null | undefined;
  onSubmitSuccess?: () => void;
  inputDelay?: number;
}

/**
 * A component that renders different forms based on the provided formName
 * @param formName The name/identifier of the form to render
 * @param onSubmitSuccess Optional callback for when a form is successfully submitted
 * @param inputDelay Time in seconds to wait before showing the form
 */
export default function FormRenderer({ formName, onSubmitSuccess, inputDelay = 0 }: FormRendererProps) {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  
  // If no form name is provided, don't render anything
  if (!formName) {
    return null;
  }
  
  // Remove duplicate delay timer - Home.tsx already handles this
  console.log(`[FormRenderer] Rendering form: ${formName}`);
  
  // Get form components
  const formComponents: Record<string, React.ComponentType<any>> = {
    SubmitInterestForm: lazy(() => import('./SubmitInterestForm')),
    SubmitReconsiderationForm: lazy(() => import('./SubmitReconsiderationForm')),
  };
  
  // Initialize form submission hook with appropriate form name
  const formSubmit = useFormSubmit(formName, {
    onSuccess: (data) => {
      // Set form as submitted
      setSubmitted(true);
      
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
  
  // If the form has been submitted, show a success message
  if (submitted) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="flex flex-row items-center space-x-2 text-green-600">
          <CheckCircle2 size={24} />
          <CardTitle>Thank You!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Your form has been submitted successfully. We appreciate your input and will be in touch shortly.
          </p>
        </CardContent>
      </Card>
    );
  }
  
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
