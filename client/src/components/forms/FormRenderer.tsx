// client/src/components/forms/FormRenderer.tsx
import React, { Suspense, useEffect, useState } from "react";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { useToast } from "@/hooks/use-toast";

interface FormRendererProps {
  formName: string | null | undefined;
  onSubmitSuccess?: () => void;
}

const FormRenderer: React.FC<FormRendererProps> = ({ formName, onSubmitSuccess }) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();
  
  // Set up the form submission hook if we have a valid form name
  const formSubmit = formName 
    ? useFormSubmit(formName, {
        onSuccess: () => {
          setIsSubmitted(true);
          if (onSubmitSuccess) {
            onSubmitSuccess();
          }
        },
        onError: (error) => {
          toast({
            title: "Form Submission Failed",
            description: error.message,
            variant: "destructive",
          });
        }
      })
    : null;
  
  useEffect(() => {
    console.log("[FormRenderer] Initializing with formName:", formName);
    // Reset submission state when form changes
    setIsSubmitted(false);
  }, [formName]);

  if (!formName) {
    console.log("[FormRenderer] No form name provided, rendering nothing");
    return null; // Or some placeholder/message if no form name is provided
  }

  if (isSubmitted) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center">
        <h3 className="text-lg font-semibold text-green-700 mb-2">Thank you for your submission!</h3>
        <p className="text-green-600">We have received your information and will contact you soon.</p>
      </div>
    );
  }

  console.log(`[FormRenderer] Attempting to dynamically load form: ${formName}`);
  
  const FormComponent = React.lazy(() =>
    import(`./${formName}`)
      .then((module) => {
        console.log(`[FormRenderer] Successfully loaded form: ${formName}`);
        return module;
      })
      .catch((error) => {
        console.error(`[FormRenderer] Failed to load form: ${formName}`, error);
        console.log("[FormRenderer] Falling back to FormNotFound component");
        return import("./FormNotFound"); // fallback component.
      }),
  );

  console.log(`[FormRenderer] Rendering form component with name: ${formName}`);
  
  return (
    <Suspense fallback={<div>Loading form...</div>}>
      {/* Pass the form submission hook to the form component */}
      <FormComponent 
        key={formName} 
        formSubmit={formSubmit}
      />
    </Suspense>
  );
};

export default FormRenderer;
