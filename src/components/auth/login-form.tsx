
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
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, User } from "firebase/auth"
import { useRouter } from "next/navigation"
import { Chrome, Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"


const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
})

export function LoginForm() {
  const { toast } = useToast()
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { refetchProfile } = useAuth();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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
       return await response.json();
    } catch (error: any) {
      console.error("Error saving user to DB", error);
      // Don't show a toast here, it might be confusing during login
      return null;
    }
  };

  const handleSuccessfulLogin = async (user: User) => {
    // Ensure user is in our DB (for Google Sign-In cases)
    await saveUserToDb(user);
    // Refetch profile to get the latest role
    await refetchProfile(); 
    
    // Fetch the role again after refetch because the one in useAuth context might be stale
    const profileResponse = await fetch(`/api/users/${user.uid}`);
    if (profileResponse.ok) {
        const profile = await profileResponse.json();
        toast({ title: "Login Successful", description: "Welcome back!" });

        // Role-based redirection
        switch (profile.role) {
            case 'admin':
                router.push('/admin');
                break;
            case 'boat_owner':
                router.push('/dashboard');
                break;
            case 'captain':
                router.push('/captain');
                break;
            case 'rider':
            default:
                router.push('/profile');
                break;
        }
    } else {
        // Fallback if profile fetch fails
        toast({ title: "Login Successful", description: "Could not retrieve user role, redirecting to profile." });
        router.push('/profile');
    }
  }


  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    setIsSubmitting(true);
    try {
      const result = await signInWithPopup(auth, provider);
      await handleSuccessfulLogin(result.user);
    } catch (error: any) {
       toast({
        title: "Login Failed",
        description: "The email or password you entered is incorrect. Please double-check your credentials.",
        variant: "destructive",
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      await handleSuccessfulLogin(userCredential.user);
    } catch (error: any) {
       toast({
        title: "Login Failed",
        description: "The email or password you entered is incorrect. Please double-check your credentials.",
        variant: "destructive",
      })
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
       <CardContent className="space-y-4 pt-6">
          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isSubmitting}>
            <Chrome className="mr-2 h-4 w-4" />
            Sign in with Google
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
                 <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                     <Link href="/forgot-password"
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                     >
                       Forgot password?
                    </Link>
                  </div>
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
           <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing In..." : "Sign In"}
          </Button>
      </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <p className="text-sm text-center text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/signup" className="font-semibold text-primary underline-offset-4 hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
    </Form>
  )
}
