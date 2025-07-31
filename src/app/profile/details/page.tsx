
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/header";
import { User, Mail, Calendar as CalendarIcon, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ProfileDetailsPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

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

  if (loading || !user || !profile) {
    return (
       <div className="min-h-dvh w-full bg-secondary/50">
         <Header />
         <main className="flex w-full items-start justify-center p-4 sm:p-6 md:p-8">
            <div className="w-full max-w-2xl space-y-6">
                <Skeleton className="h-8 w-48" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent className="flex items-center gap-6">
                         <Skeleton className="h-24 w-24 rounded-full" />
                         <div className="w-full space-y-4">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-5 w-full" />
                            <Skeleton className="h-5 w-1/2" />
                         </div>
                    </CardContent>
                </Card>
            </div>
         </main>
       </div>
    )
  }

  return (
    <div className="min-h-dvh w-full bg-secondary/50">
      <Header />

      <main className="flex w-full items-start justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-2xl space-y-6">
          <h1 className="text-3xl font-bold">Your Profile</h1>

          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Here are the details associated with your BlueRide account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20 border-2 border-primary">
                        <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
                        <AvatarFallback className="text-2xl">{getInitials(user.displayName)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="text-2xl font-bold">{user.displayName}</h2>
                        <Badge variant={profile.role === 'admin' ? 'destructive' : profile.role === 'boat_owner' ? 'default' : 'secondary'}>
                          <Shield className="mr-2 h-3 w-3" />
                          {profile.role?.replace('_', ' ')}
                        </Badge>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <p className="text-foreground">
                            <span className="font-semibold">Full Name:</span> {user.displayName}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <p className="text-foreground">
                             <span className="font-semibold">Email:</span> {user.email}
                        </p>
                    </div>
                    {user.metadata.creationTime && (
                       <div className="flex items-center gap-3">
                            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                            <p className="text-foreground">
                                <span className="font-semibold">Member since:</span> {new Date(user.metadata.creationTime).toLocaleDateString()}
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

