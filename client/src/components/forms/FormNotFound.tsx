// client/src/components/forms/FormNotFound.tsx
import React, { useEffect } from "react";

interface FormNotFoundProps {
  [key: string]: any;
}

const FormNotFound: React.FC<FormNotFoundProps> = (props) => {
  useEffect(() => {
    console.log("[FormNotFound] Component mounted with props:", props || {});
  }, [props]);

  return (
    <div className="text-red-500">
      Error: The requested form component could not be loaded.
    </div>
  );
};

export default FormNotFound;
