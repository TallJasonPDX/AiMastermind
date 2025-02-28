// client/src/components/forms/FormRenderer.tsx
import React, { Suspense, useEffect } from "react";

interface FormRendererProps {
  formName: string | null | undefined;
}

const FormRenderer: React.FC<FormRendererProps> = ({ formName }) => {
  useEffect(() => {
    console.log("[FormRenderer] Initializing with formName:", formName);
  }, []);

  useEffect(() => {
    console.log("[FormRenderer] Form name changed to:", formName);
  }, [formName]);

  if (!formName) {
    console.log("[FormRenderer] No form name provided, rendering nothing");
    return null; // Or some placeholder/message if no form name is provided
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

  return (
    <Suspense fallback={<div>Loading form...</div>}>
      <FormComponent />
    </Suspense>
  );
};

export default FormRenderer;
