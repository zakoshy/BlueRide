import { SignupForm } from "@/components/auth/signup-form";
import { Card } from "@/components/ui/card";
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export default function SignupPage() {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-background p-4 relative">
       <Button asChild variant="ghost" className="absolute top-4 left-4">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
             <Image src="/boatlogo.jpg" alt="BlueRide Logo" width={48} height={48} className="mx-auto h-12 w-12 rounded-lg"/>
            <h1 className="text-3xl font-bold mt-2">Create Your BlueRide Account</h1>
            <p className="text-muted-foreground">Join us and start your journey today.</p>
        </div>
        <Card className="shadow-xl">
          <SignupForm />
        </Card>
      </div>
    </div>
  );
}
