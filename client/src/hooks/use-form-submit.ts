// client/src/hooks/use-form-submit.ts
import { useState } from "react";
import { API_BASE_URL } from "@/config";
import { useToast } from "@/hooks/use-toast";

export interface FormSubmissionData {
  name: string;
  email: string;
  message?: string;
  phone?: string;
  comments?: string;
  [key: string]: any;
}

interface FormSubmissionResponse {
  success: boolean;
  id?: number;
  message?: string;
  email_sent?: boolean;
}

interface FormSubmissionOptions {
  onSuccess?: (data: FormSubmissionResponse) => void;
  onError?: (error: Error) => void;
}

export const useFormSubmit = (formName: string, options?: FormSubmissionOptions) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  
  const submitForm = async (data: FormSubmissionData) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);
    
    try {
      console.log(`[useFormSubmit] Submitting form: ${formName} with data:`, data);
      
      // Map the form data to match our API schema
      const formData = {
        form_name: formName,
        name: data.name,
        email: data.email,
        phone: data.phone || data.phoneNumber || null,
        message: data.message || data.comments || null,
        additional_data: Object.keys(data)
          .filter(key => !['name', 'email', 'phone', 'phoneNumber', 'message', 'comments'].includes(key))
          .reduce((obj, key) => {
            obj[key] = data[key];
            return obj;
          }, {} as Record<string, any>)
      };
      
      // Submit to API
      const response = await fetch(`${API_BASE_URL}/form-submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error: ${response.status}`);
      }
      
      const result = await response.json() as FormSubmissionResponse;
      console.log(`[useFormSubmit] Form submitted successfully:`, result);
      
      setSuccess(true);
      toast({
        title: "Submission successful",
        description: "Your form has been submitted successfully.",
        variant: "default",
      });
      
      // Call success callback if provided
      if (options?.onSuccess) {
        options.onSuccess(result);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error(`[useFormSubmit] Error submitting form:`, err);
      
      setError(errorMessage);
      toast({
        title: "Submission failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Call error callback if provided
      if (options?.onError && err instanceof Error) {
        options.onError(err);
      }
      
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return {
    submitForm,
    isSubmitting,
    error,
    success,
    resetStatus: () => {
      setError(null);
      setSuccess(false);
    }
  };
};