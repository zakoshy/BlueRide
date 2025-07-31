
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from 'next/link';
import { ArrowLeft, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-background p-4 relative">
        <Button asChild variant="ghost" className="absolute top-4 left-4">
          <Link href="/login">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Link>
        </Button>

      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
            <Car className="mx-auto h-12 w-12 text-primary"/>
            <h1 className="text-3xl font-bold mt-2">Forgot Your Password?</h1>
            <p className="text-muted-foreground">No problem. Enter your email below and we'll send you a link to reset it.</p>
        </div>
        <Card className="shadow-xl">
          <ForgotPasswordForm />
        </Card>
      </div>
    </div>
  );
}
