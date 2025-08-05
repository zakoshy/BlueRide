
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Anchor, Ship, User, Map, CloudSun, CheckSquare, BrainCircuit } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Header } from "@/components/header";
import { useToast } from "@/hooks/use-toast";
import type { User as FirebaseUser } from "firebase/auth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getFirstMateBriefing, type FirstMateInput, type FirstMateOutput } from "@/ai/flows/first-mate-flow";

interface Booking {
    _id: string;
    pickup: string;
    destination: string;
    status: 'confirmed' | 'completed' | 'rejected';
    rider: { name: string, uid: string };
    boat: { name: string, licenseNumber: string };
    seats?: number;
    bookingType: 'seat' | 'whole_boat';
    createdAt: string;
}


export default function CaptainDashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isCaptain, setIsCaptain] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<Booking[]>([]);
  
  const [isBriefingDialogOpen, setBriefingDialogOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Booking | null>(null);
  const [briefing, setBriefing] = useState<FirstMateOutput | null>(null);
  const [isBriefingLoading, setBriefingLoading] = useState(false);


  const fetchCaptainTrips = useCallback(async (currentUser: FirebaseUser) => {
    if (!currentUser) return;
    setLoading(true);
    try {
        // We now fetch 'completed' trips as they are ready for departure upon payment
        const response = await fetch(`/api/captain/trips?captainId=${currentUser.uid}`);
        if (response.ok) {
            const data = await response.json();
            setTrips(data);
        } else {
            toast({ title: "Error", description: "Failed to fetch assigned trips.", variant: "destructive" });
        }
    } catch (error) {
        console.error("Failed to fetch trips", error);
        toast({ title: "Error", description: "An unexpected error occurred while fetching trips.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (profile?.role === 'captain' || profile?.role === 'admin') {
      setIsCaptain(true);
      fetchCaptainTrips(user);
    } else {
      router.push('/profile');
    }
  }, [user, profile, authLoading, router, fetchCaptainTrips]);

  const handleGetBriefing = async (trip: Booking) => {
    setSelectedTrip(trip);
    setBriefingDialogOpen(true);
    setBriefingLoading(true);
    setBriefing(null);
    try {
        const input: FirstMateInput = {
            pickup: trip.pickup,
            destination: trip.destination,
        };
        const briefingData = await getFirstMateBriefing(input);
        setBriefing(briefingData);
    } catch (error) {
        console.error("Failed to get AI briefing", error);
        toast({ title: "Briefing Error", description: "Could not retrieve AI briefing for this trip.", variant: "destructive"});
        setBriefingDialogOpen(false);
    } finally {
        setBriefingLoading(false);
    }
  }


  if (loading || authLoading) {
    return (
       <div className="flex min-h-dvh w-full items-center justify-center bg-secondary/50 p-4">
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
    );
  }

  if (!isCaptain) {
    return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-4 text-center">
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
    );
  }
  
  // Trips are now auto-completed on payment, so we show them here as ready for departure.
  const activeTrips = trips.filter(t => t.status === 'completed');

  return (
    <div className="min-h-dvh w-full bg-secondary/50">
      <Header />
      <main className="container mx-auto p-4 sm:p-6 md:p-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2"><Anchor/> Captain's Dashboard</h1>
        <p className="text-muted-foreground mb-8">Welcome, {user?.displayName}. Here are your assigned trips ready for departure.</p>
        
        <div className="grid grid-cols-1 gap-8">
            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Ship/>Trips Ready for Departure</CardTitle>
                        <CardDescription>These trips are paid for and ready to go. Get an AI briefing for weather and navigation before you depart.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       {activeTrips.length > 0 ? (
                            <div className="space-y-4">
                                {activeTrips.map(trip => (
                                    <Card key={trip._id} className="p-4 grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                                        <div className="md:col-span-2">
                                            <p className="font-semibold text-primary">{trip.pickup} to {trip.destination}</p>
                                            <p className="text-sm text-muted-foreground">Rider: {trip.rider.name}</p>
                                            <p className="text-sm text-muted-foreground">Vessel: {trip.boat.name} ({trip.boat.licenseNumber})</p>
                                            <p className="text-xs text-muted-foreground">{trip.bookingType === 'seat' ? `${trip.seats} seat(s)` : 'Whole boat charter'}</p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <Button size="sm" onClick={() => handleGetBriefing(trip)}>
                                                <BrainCircuit className="mr-2"/> Get Briefing
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                       ) : (
                         <div className="text-center py-12">
                            <Anchor className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-medium">No Trips Assigned</h3>
                            <p className="mt-1 text-sm text-muted-foreground">You have no trips assigned right now. Check back soon!</p>
                         </div>
                       )}
                    </CardContent>
                </Card>
            </div>
        </div>
      </main>

       <Dialog open={isBriefingDialogOpen} onOpenChange={setBriefingDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>First Mate Briefing: {selectedTrip?.pickup} to {selectedTrip?.destination}</DialogTitle>
            <DialogDescription>
              AI-powered trip analysis for your safety and efficiency.
            </DialogDescription>
          </DialogHeader>
          {isBriefingLoading && (
             <div className="space-y-4 py-8">
                <Skeleton className="h-8 w-3/4 mx-auto" />
                <Skeleton className="h-4 w-1/2 mx-auto" />
                <div className="flex justify-center items-center gap-2 text-muted-foreground">
                    <BrainCircuit className="h-5 w-5 animate-pulse" />
                    <p>Your AI First Mate is analyzing the route and weather...</p>
                </div>
            </div>
          )}
          {briefing && !isBriefingLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-2">
                             <CardTitle className="text-lg flex items-center gap-2"><CloudSun /> Marine Forecast</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-1">
                            <p><span className="font-semibold">Wind:</span> {briefing.weather.wind}</p>
                            <p><span className="font-semibold">Waves:</span> {briefing.weather.waves}</p>
                            <p><span className="font-semibold">Visibility:</span> {briefing.weather.visibility}</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="pb-2">
                             <CardTitle className="text-lg flex items-center gap-2"><Anchor /> Navigation Advice</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">{briefing.advice}</p>
                        </CardContent>
                    </Card>
                </div>
                <div className="space-y-4">
                    <h3 className="font-semibold text-center">Route Map</h3>
                    <div className="aspect-video w-full rounded-md border overflow-hidden">
                        <iframe
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            loading="lazy"
                            allowFullScreen
                            src={`https://www.google.com/maps/embed/v1/directions?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&origin=${briefing.route.pickup.lat},${briefing.route.pickup.lng}&destination=${briefing.route.destination.lat},${briefing.route.destination.lng}&mode=driving`}>
                        </iframe>
                    </div>
                </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
