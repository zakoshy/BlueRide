
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
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { useRouter } from "next/navigation"
import { Separator } from "../ui/separator"
import { Chrome, Eye, EyeOff } from "lucide-react"
import { useState } from "react"


const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
})

export function LoginForm() {
  const { toast } = useToast()
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const saveUserToDb = async (user: { uid: string; email: string | null; displayName: string | null; }) => {
    // This function can be called for both new and existing users on Google sign-in.
    // The backend API handles the logic of creating or updating the user record.
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
        description: `We had trouble syncing your profile. ${error.message}`,
        variant: "destructive",
      });
    }
  };


  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // Save/update user info in MongoDB on every Google sign-in
      await saveUserToDb(result.user);
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      router.push('/');
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password)
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      })
      router.push('/');
    } catch (error: any) {
       toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  return (
    <Form {...form}>
       <CardContent className="space-y-4 pt-6">
          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
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
            {form.formState.isSubmitting ? "Signing In..." : "Sign In"}
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
