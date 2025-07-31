
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { auth } from "@/lib/firebase/config"
import { sendPasswordResetEmail } from "firebase/auth"
import { useState } from "react"

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
})

export function ForgotPasswordForm() {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, values.email);
      toast({
        title: "Check Your Email",
        description: "If an account exists for this email, a password reset link has been sent.",
      })
      form.reset();
    } catch (error: any) {
       let description = "An unexpected error occurred. Please try again.";
       // Firebase returns auth/user-not-found if the email doesn't exist.
       // For security, we don't want to confirm if an email is registered or not.
       // So, we show a generic success message even in this case.
       if (error.code === 'auth/user-not-found') {
            toast({
                title: "Check Your Email",
                description: "If an account exists for this email, a password reset link has been sent.",
            });
       } else if (error.code) {
            description = error.message;
            toast({
                title: "Error",
                description: description,
                variant: "destructive",
            });
       }
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4 pt-6">
            <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Reset Link"}
            </Button>
        </CardContent>
      </form>
    </Form>
  )
}
