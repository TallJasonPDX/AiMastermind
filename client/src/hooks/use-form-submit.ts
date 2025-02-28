// client/src/hooks/use-form-submit.ts

import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';

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

/**
 * Custom hook for handling form submissions
 * @param formName The identifier of the form being submitted
 * @param options Additional options for handling success and error cases
 * @returns Object containing the submit function and submission state
 */
export const useFormSubmit = (formName: string, options?: FormSubmissionOptions) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const submitForm = async (data: FormSubmissionData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      // Add form name to submission data
      const submissionData = {
        ...data,
        form_name: formName,
      };

      // Submit the form data to the backend
      const response = await apiRequest<FormSubmissionResponse>({
        method: 'POST',
        url: '/api/forms/submit',
        data: submissionData,
      });

      // Handle successful submission
      setSubmitSuccess(true);
      if (options?.onSuccess) {
        options.onSuccess(response);
      }
      
      return response;
    } catch (error) {
      // Handle error
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setSubmitError(errorMessage);
      
      if (options?.onError && error instanceof Error) {
        options.onError(error);
      }
      
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitForm,
    isSubmitting,
    submitError,
    submitSuccess,
    resetState: () => {
      setSubmitError(null);
      setSubmitSuccess(false);
    }
  };
};