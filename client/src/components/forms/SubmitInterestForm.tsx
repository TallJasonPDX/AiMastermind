// client/src/components/forms/SubmitInterestForm.tsx

import React from "react";
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
import { useFormSubmit } from "@/hooks/use-form-submit";

// Define the schema for form validation using Zod
const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.string().optional(),
  comments: z.string().optional(),
});

// Define the type for form values based on the schema
type FormValues = z.infer<typeof formSchema>;

// Props interface for the form component
interface SubmitInterestFormProps {
  formSubmit?: ReturnType<typeof useFormSubmit> | null;
}

// The main form component implementation
function InterestFormComponent({ formSubmit }: SubmitInterestFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      comments: "",
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      if (formSubmit) {
        // Use the provided form submission hook
        await formSubmit.submitForm(data);
        // Reset form on successful submission
        form.reset();
      } else {
        // Fallback in case hook wasn't provided (for testing or direct usage)
        console.log("Interest Form Data (no formSubmit hook):", data);
        alert(
          `Interest form submitted for ${data.email}. (This is a demo, no email is sent.)`,
        );
        form.reset();
      }
    } catch (error) {
      console.error("Form submission error:", error);
      // Error handling is taken care of by the hook
    }
  };

  return (
    <Form {...form}>
      <div className="mb-4">
        <p className="text-center text-muted-foreground">
          You seem to be a great fit! If you would like the organizer to contact you with next steps, please share your interest using this form.
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
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="(Optional)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="comments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comments</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional comments or questions (Optional)"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          disabled={formSubmit?.isSubmitting}
        >
          {formSubmit?.isSubmitting ? "Submitting..." : "Submit Interest"}
        </Button>
      </form>
    </Form>
  );
}

// Export the modern form implementation as the default export
export default function SubmitInterestForm(props: SubmitInterestFormProps) {
  // Check if we received the form submission hook and other props
  return <InterestFormComponent {...props} />;
}