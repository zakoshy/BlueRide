
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import dynamic from 'next/dynamic';

const InteractiveMap = dynamic(() => import('@/components/interactive-map'), {
  ssr: false,
  loading: () => <Skeleton className="h-[calc(100vh-57px)] w-full" />
});

export default function CaptainDashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [isCaptain, setIsCaptain] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (profile?.role === 'captain' || profile?.role === 'admin') {
      setIsCaptain(true);
    } else {
      router.push('/profile');
    }
  }, [user, profile, authLoading, router]);

  if (authLoading || !isCaptain) {
    return (
       <div className="flex min-h-dvh w-full items-center justify-center bg-secondary/50 p-4">
        {authLoading ? (
            <Skeleton className="h-48 w-full max-w-lg" />
        ) : (
            <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
                <Alert variant="destructive" className="max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Access Denied</AlertTitle>
                    <AlertDescription>
                       This dashboard is for captains only.
                    </AlertDescription>
                </Alert>
                <Button asChild variant="link" className="mt-4">
                  <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Return to Home
                  </Link>
                </Button>
            </div>
        )}
       </div>
    );
  }

  return (
    <div className="h-screen w-full">
        <InteractiveMap />
    </div>
  );
}
