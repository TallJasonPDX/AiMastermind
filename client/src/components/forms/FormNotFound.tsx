// client/src/components/forms/FormNotFound.tsx

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface FormNotFoundProps {
  formName: string;
  [key: string]: any;
}

/**
 * A fallback component displayed when a requested form doesn't exist
 * @param formName The name of the form that wasn't found
 */
export default function FormNotFound({ formName }: FormNotFoundProps) {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center space-x-2 text-yellow-600">
        <AlertTriangle size={24} />
        <CardTitle>Form Not Found</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          The requested form <strong>"{formName}"</strong> could not be found or is not currently available.
        </p>
      </CardContent>
    </Card>
  );
}