
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
import { CardContent, CardFooter } from "@/components/ui/card"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { auth } from "@/lib/firebase/config"
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from "firebase/auth"
import { useRouter } from "next/navigation"
import { Chrome, Eye, EyeOff } from "lucide-react"
import { useState } from "react"

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
})


export function SignupForm() {
  const { toast } = useToast()
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  })

  const saveUserToDb = async (user: { uid: string; email: string | null; displayName: string | null; }) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          name: user.displayName
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save user to database');
      }
    } catch (error: any) {
      toast({
        title: "Database Error",
        description: `Your account was created, but we couldn't save your profile. ${error.message}`,
        variant: "destructive",
      });
    }
  };


  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await saveUserToDb(result.user);
      toast({
        title: "Account Created",
        description: "Welcome to BlueRide! Please log in to continue.",
      });
      router.push('/login');
    } catch (error: any) {
      toast({
        title: "Sign up Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password)
      const user = userCredential.user;
      if (user) {
        await updateProfile(user, { displayName: values.name })
        await saveUserToDb({
            uid: user.uid,
            email: user.email,
            displayName: values.name
        });
      }
      
      toast({
        title: "Signup Successful",
        description: "Your account has been created. Please log in to continue.",
      })
      router.push('/login');
    } catch (error: any) {
       let description = "An unexpected error occurred. Please try again.";
       if (error.code === 'auth/email-already-in-use') {
            // This case handles when a user exists in Firebase Auth but maybe not in our DB (e.g., deleted from DB).
            // We can try to log them in and create their DB profile.
            description = "This email is already registered. Attempting to log you in instead.";
            toast({
                title: "Existing Account",
                description: description,
            });
            try {
                const loginCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
                await saveUserToDb({
                    uid: loginCredential.user.uid,
                    email: loginCredential.user.email,
                    displayName: values.name, // Use the new name they provided
                });
                await updateProfile(loginCredential.user, { displayName: values.name });
                router.push('/profile');
            } catch (loginError: any) {
                 toast({
                    title: "Login Failed",
                    description: "We found an account with this email, but the password was incorrect.",
                    variant: "destructive",
                });
            }
       } else if (error.code) {
           description = error.message;
            toast({
                title: "Signup Failed",
                description: description,
                variant: "destructive",
            });
       }
    }
  }

  return (
    <Form {...form}>
      <CardContent className="space-y-4 pt-6">
          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
            <Chrome className="mr-2 h-4 w-4" />
            Sign up with Google
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
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
                  <Input placeholder="name@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                 <div className="relative">
                    <FormControl>
                      <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-0 right-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
                    </Button>
                  </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Creating Account..." : "Create Account"}
          </Button>
      </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
      </CardFooter>
    </Form>
  )
}
