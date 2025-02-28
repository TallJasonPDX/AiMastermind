// client/src/components/forms/FormRenderer.tsx
import React, { Suspense } from "react";

interface FormRendererProps {
  formName: string | null | undefined;
}

const FormRenderer: React.FC<FormRendererProps> = ({ formName }) => {
  if (!formName) {
    return null; // Or some placeholder/message if no form name is provided
  }

  const FormComponent = React.lazy(() =>
    import(`./${formName}`).catch(() => {
      console.error(`Failed to load form: ${formName}`);
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
