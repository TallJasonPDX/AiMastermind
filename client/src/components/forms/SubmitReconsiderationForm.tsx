// client/src/components/forms/SubmitReconsiderationForm.tsx

import React from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
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

// Define the type for form values based on the schema
type FormValues = z.infer<typeof formSchema>;

export function SubmitReconsiderationForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    // In a real app, you'd send this data to a backend endpoint.
    console.log("Reconsideration Form Data:", data);
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
import React, { useState, useEffect } from "react";

interface SubmitReconsiderationFormProps {
  [key: string]: any;
}

const SubmitReconsiderationForm: React.FC<SubmitReconsiderationFormProps> = (props) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    reason: ""
  });

  useEffect(() => {
    console.log("[SubmitReconsiderationForm] Component mounted with props:", props || {});
  }, [props]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    console.log(`[SubmitReconsiderationForm] Field changed: ${name} = ${value}`);
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[SubmitReconsiderationForm] Form submitted with data:", formData);
    // Here you would normally submit the form data to your backend
    alert("Thank you for your submission. We'll review your request and get back to you.");
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Request Reconsideration</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="reason" className="block text-sm font-medium mb-1">Why do you believe we should reconsider?</label>
          <textarea
            id="reason"
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border rounded-md"
            required
          ></textarea>
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
        >
          Submit Request
        </button>
      </form>
    </div>
  );
};

export default SubmitReconsiderationForm;
