
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
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, User, signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import { Separator } from "../ui/separator"
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
  const { refetchProfile } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSuccessfulLogin = async (user: User) => {
    try {
        const response = await fetch(`/api/users/${user.uid}`);
        let profile;
        if (response.ok) {
           profile = await response.json();
        } else if (response.status === 404) {
             console.error("User profile not found in DB, but exists in Auth.");
             // The user is authenticated, but their profile isn't in our DB.
             // This could be a sync issue. We will let them in, but they will have a default role.
             // A better solution would be to create the profile here or flag for an admin.
             toast({
                title: "Profile Issue",
                description: "We couldn't find your user profile details. Some features might be limited.",
                variant: "destructive"
             })
        } else {
            // Another error occurred fetching the profile
            toast({
                title: "Login Warning",
                description: "Could not retrieve your user profile. Please try again later.",
                variant: "destructive",
            });
             // We don't sign them out here, because they did authenticate correctly.
        }

        toast({
            title: "Login Successful",
            description: "Welcome back!",
        });

        // Redirect based on role
        if (profile?.role === 'admin') {
            router.push('/admin');
        } else if (profile?.role === 'boat_owner') {
            router.push('/dashboard');
        } else {
            router.push('/profile');
        }

    } catch (error) {
        console.error("Failed to fetch user profile for redirection", error);
        toast({
            title: "Error",
            description: "An unexpected error occurred after login. Redirecting to your profile.",
            variant: "destructive",
        });
        // Still redirect to a default page even if the fetch fails
        router.push('/profile');
    } finally {
        setIsSubmitting(false);
    }
  }


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
      toast({
        title: "Database Error",
        description: `We had trouble syncing your profile. ${error.message}`,
        variant: "destructive",
      });
      return null;
    }
  };


  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    setIsSubmitting(true);
    try {
      const result = await signInWithPopup(auth, provider);
      await saveUserToDb(result.user);
      await handleSuccessfulLogin(result.user);
    } catch (error: any) {
      let description = "An unknown error occurred during Google sign-in.";
      if (error.code) {
        description = error.message;
      }
       toast({
        title: "Login Failed",
        description: description,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      await handleSuccessfulLogin(userCredential.user);
    } catch (error: any) {
       let description = "An unexpected error occurred. Please try again.";
       if (error.code === 'auth/invalid-credential') {
            description = "The email or password you entered is incorrect. Please double-check your credentials.";
        } else if (error.code) {
            description = error.message;
        }
       toast({
        title: "Login Failed",
        description: description,
        variant: "destructive",
      })
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
