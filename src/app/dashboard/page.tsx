
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, PlusCircle, Ship, BookOpen, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// Mock data - replace with actual data from your API
const mockBoats = [
  { id: 1, name: "Sea Serpent", capacity: 8, status: "active" },
  { id: 2, name: "Ocean's Grace", capacity: 12, status: "maintenance" },
];

const mockBookings = [
    { id: 1, rider: "Alice", boat: "Sea Serpent", status: "pending", date: "2024-08-15" },
    { id: 2, rider: "Bob", boat: "Sea Serpent", status: "accepted", date: "2024-08-16" },
    { id: 3, rider: "Charlie", boat: "Ocean's Grace", status: "pending", date: "2024-08-17" },
];


export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchUserData = async () => {
      try {
        const response = await fetch(`/api/users/${user.uid}`);
        if (response.ok) {
          const data = await response.json();
          setUserData(data);
          if (data.role === 'boat_owner' || data.role === 'admin') {
            setIsOwner(true);
          }
        } else {
            setUserData(null);
        }
      } catch (error) {
        console.error("Failed to fetch user data", error);
        setUserData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user, authLoading, router]);

  if (loading || authLoading) {
    return (
       <div className="flex min-h-dvh w-full items-center justify-center bg-background p-4">
        <div className="w-full max-w-4xl space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full" />
           <Card>
            <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-full max-w-lg" />
            </CardHeader>
             <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
             </CardContent>
           </Card>
        </div>
       </div>
    )
  }

  if (!isOwner) {
    return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-4 text-center">
            <Alert variant="destructive" className="max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Access Denied</AlertTitle>
                <AlertDescription>
                   You do not have permission to view this page. This dashboard is for boat owners only.
                </AlertDescription>
            </Alert>
            <Button asChild variant="link" className="mt-4">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Home
              </Link>
            </Button>
        </div>
    )
  }

  return (
    <div className="min-h-dvh w-full bg-secondary/50">
       <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2 font-bold">
                <Ship className="h-6 w-6 text-primary" />
                Boat Owner Dashboard
            </Link>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 md:p-8">
        <h1 className="text-3xl font-bold mb-2">Welcome, {user?.displayName || 'Owner'}!</h1>
        <p className="text-muted-foreground mb-8">Manage your boats and bookings all in one place.</p>
        
        <Tabs defaultValue="bookings">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="bookings">Booking Requests</TabsTrigger>
                <TabsTrigger value="boats">My Boats</TabsTrigger>
                <TabsTrigger value="add_boat">Add New Boat</TabsTrigger>
            </TabsList>

            <TabsContent value="bookings" className="mt-6">
                 <Card>
                    <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BookOpen/>Incoming Bookings</CardTitle>
                    <CardDescription>
                        Review and respond to new ride requests from riders.
                    </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {mockBookings.map(booking => (
                                <Card key={booking.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4">
                                    <div>
                                        <p className="font-semibold">{booking.rider} booked <span className="text-primary">{booking.boat}</span></p>
                                        <p className="text-sm text-muted-foreground">Scheduled for: {booking.date}</p>
                                    </div>
                                    <div className="flex items-center gap-2 self-end sm:self-center">
                                         <Badge variant={booking.status === 'pending' ? 'default' : 'secondary'} className={booking.status === 'accepted' ? 'bg-green-500 text-white' : ''}>{booking.status}</Badge>
                                         {booking.status === 'pending' && (
                                            <>
                                                <Button size="sm" variant="outline">Reject</Button>
                                                <Button size="sm">Accept</Button>
                                            </>
                                         )}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="boats" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Ship/>Your Fleet</CardTitle>
                        <CardDescription>
                            A list of your currently registered boats.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {mockBoats.map(boat => (
                            <Card key={boat.id} className="p-4 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">{boat.name}</p>
                                    <p className="text-sm text-muted-foreground">Capacity: {boat.capacity} riders</p>
                                </div>
                                <Button variant="outline" size="sm">Edit</Button>
                            </Card>
                        ))}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="add_boat" className="mt-6">
                <Card>
                    <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PlusCircle/>Add a New Boat</CardTitle>
                    <CardDescription>
                        Fill out the details below to list a new boat on the BlueRide platform.
                    </CardDescription>
                    </CardHeader>
                    <CardContent>
                    <form className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="boat-name">Boat Name</Label>
                            <Input id="boat-name" placeholder="e.g., The Voyager" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="capacity">Passenger Capacity</Label>
                            <Input id="capacity" type="number" placeholder="e.g., 10" />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="boat-photos">Boat Photos</Label>
                            <Input id="boat-photos" type="file" multiple />
                             <p className="text-sm text-muted-foreground">Upload one or more clear photos of your boat.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" placeholder="Describe your boat, its features, and any rules for riders." />
                        </div>
                        <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                            Add Boat
                        </Button>
                    </form>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>

      </main>
    </div>
  );
}
