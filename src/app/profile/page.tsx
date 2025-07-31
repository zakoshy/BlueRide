
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Ship, Star } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export default function ProfilePage() {
  const { user, profile, loading, refetchProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const getInitials = (name?: string | null) => {
    if (!name) return "";
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  const handleBecomeOwner = async () => {
    if (!user) return;
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/users/${user.uid}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'boat_owner' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update role');
      }

      await refetchProfile();

      toast({
        title: "Success!",
        description: "You are now registered as a boat owner. You can access the dashboard from the user menu.",
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };


  if (loading || !user) {
    return (
       <div className="flex min-h-dvh w-full items-center justify-center bg-secondary/50 p-4">
        <div className="w-full max-w-2xl space-y-6">
          <Skeleton className="h-8 w-48" />
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-56" />
                </div>
              </div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full max-w-md" />
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="space-y-2">
                 <Skeleton className="h-4 w-24" />
                 <Skeleton className="h-10 w-full" />
               </div>
                <div className="space-y-2">
                 <Skeleton className="h-4 w-24" />
                 <Skeleton className="h-10 w-full" />
               </div>
               <Skeleton className="h-11 w-32" />
            </CardContent>
          </Card>
        </div>
       </div>
    )
  }

  return (
    <div className="min-h-dvh w-full bg-secondary/50">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
            <Button asChild variant="ghost">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
        </div>
      </header>

      <main className="flex w-full items-start justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-2xl space-y-6">
          <h1 className="text-3xl font-bold">Your Profile</h1>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary">
                  <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
                  <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">{user.displayName}</CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </div>
              </div>
            </CardHeader>
             <CardContent>
                <Alert>
                    <Ship className="h-4 w-4" />
                    <AlertTitle>Account Status</AlertTitle>
                    <AlertDescription>
                        You are currently a <span className="font-semibold capitalize">{profile?.role || 'rider'}.</span> 
                        {profile?.role === 'boat_owner' && " You can manage your fleet from the Owner Dashboard."}
                    </AlertDescription>
                </Alert>
            </CardContent>
          </Card>

          {profile?.role === 'rider' && (
             <Card>
                <CardHeader>
                <CardTitle className="flex items-center gap-2"><Star className="text-yellow-400"/>Become a Boat Owner</CardTitle>
                <CardDescription>
                    Ready to list your boat and start earning? Upgrade your account to get access to the boat owner dashboard.
                </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleBecomeOwner} disabled={isUpdating} size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                       {isUpdating ? 'Upgrading...' : 'Upgrade My Account'}
                    </Button>
                </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Book a Ride</CardTitle>
              <CardDescription>
                Ready for your next adventure? Fill out the details below to find a ride.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pickup">Pickup Location</Label>
                  <Input id="pickup" placeholder="e.g., Mbita Ferry Terminal" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dropoff">Drop-off Location</Label>
                  <Input id="dropoff" placeholder="e.g., Takawiri Island" />
                </div>
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Search for Boats
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

    