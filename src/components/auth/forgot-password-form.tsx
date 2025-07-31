
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
        description: "A password reset link has been sent to your email address.",
      })
      form.reset();
    } catch (error: any) {
       let description = "An unexpected error occurred. Please try again.";
       if (error.code === 'auth/user-not-found') {
            description = "No user found with this email address. Please check your email and try again.";
       } else if (error.code) {
            description = error.message;
       }
       toast({
        title: "Error",
        description: description,
        variant: "destructive",
      })
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
