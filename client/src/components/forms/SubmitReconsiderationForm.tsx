// client/src/components/forms/SubmitReconsiderationForm.tsx

import React, { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Define the schema for form validation using Zod
const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
});

// Define types for our components
type FormValues = z.infer<typeof formSchema>;

interface SubmitReconsiderationFormProps {
  [key: string]: any;
}

// The functional component that uses react-hook-form + zod
export function SubmitReconsiderationForm() {
  useEffect(() => {
    console.log("[SubmitReconsiderationForm] Component mounted with form hook");
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    // In a real app, you'd send this data to a backend endpoint.
    console.log("[SubmitReconsiderationForm] Form submitted with data:", data);
    alert(
      `Reconsideration request submitted for ${data.email}. (This is a demo, no email is sent.)`,
    );
    form.reset(); // Clear form after submit
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 p-4 border rounded-lg shadow-sm"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="your.email@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit Request</Button>
      </form>
    </Form>
  );
}

// Export the modern implementation as the default 
export default function LegacyReconsiderationForm() {
  console.log("[LegacyReconsiderationForm] Legacy form component rendered");
  // Use the modern implementation
  return <SubmitReconsiderationForm />;
};