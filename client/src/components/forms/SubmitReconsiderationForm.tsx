
// client/src/components/forms/SubmitReconsiderationForm.tsx

import React, { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  message: z.string().min(5, {
    message: "Message must be at least 5 characters.",
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
      name: "",
      email: "",
      message: "",
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
      <div className="mb-4">
        <p className="text-center text-muted-foreground">
          If you feel we have made a mistake and would like us to reconsider, please submit the form below.
        </p>
      </div>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 p-4 border rounded-lg shadow-sm"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your Name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea placeholder="Please explain why we should reconsider your application..." {...field} />
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
