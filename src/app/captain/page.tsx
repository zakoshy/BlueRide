
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Ship, User, Navigation, Wind, Eye, CheckSquare, Sailboat, MapPin, Cloudy } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { FirstMateOutput, FirstMateInput } from "@/ai/flows/first-mate-flow";
import { getFirstMateBriefing } from "@/ai/flows/first-mate-flow";
import { Badge } from "@/components/ui/badge";

const InteractiveMap = dynamic(() => import('@/components/interactive-map'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-lg" />
});

interface Trip {
    _id: string;
    pickup: { name: string; lat: number; lng: number };
    destination: { name: string; lat: number; lng: number };
    status: string;
    seats?: number;
    bookingType: 'seat' | 'whole_boat';
    createdAt: string;
    rider: { name: string; uid: string };
    boat: { _id: string; name: string; licenseNumber: string };
}

export default function CaptainDashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isCaptain, setIsCaptain] = useState(false);
  const [loading, setLoading] = useState(true);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [briefing, setBriefing] = useState<FirstMateOutput | null>(null);
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);


  const fetchTrips = useCallback(async (captainId: string) => {
    setLoading(true);
    try {
        const response = await fetch(`/api/captain/trips?captainId=${captainId}`);
        if(response.ok) {
            const data = await response.json();
            setTrips(data);
        } else {
            toast({ title: "Error", description: "Could not fetch assigned trips.", variant: "destructive" });
        }
    } catch (error) {
        console.error("Error fetching trips:", error);
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
       // Admins can view, but fetching might require a specific captain ID.
       // For this dashboard, we'll fetch trips only for actual captains.
      if (profile.role === 'captain') {
         fetchTrips(user.uid);
      } else {
         setLoading(false);
      }
    } else {
      router.push('/profile');
    }
  }, [user, profile, authLoading, router, fetchTrips]);

  const handleSelectTrip = async (trip: Trip) => {
    // A trip can be selected even if its coordinates are missing.
    // The map component will handle the case where destination is not available.
    if (!trip.pickup?.name || !trip.destination?.name) {
        toast({
            title: "Trip Data Incomplete",
            description: "This trip is missing location data and cannot be displayed on the map.",
            variant: "destructive"
        });
        setSelectedTrip(trip);
        setBriefing(null);
        return;
    }

    setSelectedTrip(trip);
    setBriefing(null);
    setIsBriefingLoading(true);

    try {
        const input: FirstMateInput = {
            pickup: trip.pickup.name,
            destination: trip.destination.name
        };
        const briefingData = await getFirstMateBriefing(input);
        setBriefing(briefingData);
    } catch (error) {
        console.error("Error fetching briefing:", error);
        toast({ title: "Briefing Error", description: "Could not get AI First Mate briefing for this trip.", variant: "destructive" });
    } finally {
        setIsBriefingLoading(false);
    }
  };


  if (authLoading || loading) {
    return (
       <div className="flex min-h-dvh w-full items-center justify-center bg-secondary/50 p-4">
            <div className="w-full max-w-6xl space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-6 w-72" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 space-y-4">
                        <Skeleton className="h-32 w-full"/>
                        <Skeleton className="h-32 w-full"/>
                    </div>
                    <div className="md:col-span-2">
                        <Skeleton className="h-96 w-full"/>
                    </div>
                </div>
            </div>
       </div>
    );
  }

  if (!isCaptain) {
    return (
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
    );
  }

  const destination = selectedTrip ? { lat: selectedTrip.pickup.lat, lng: selectedTrip.pickup.lng } : null;

  return (
    <div className="min-h-dvh w-full bg-secondary/50">
       <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center">
                <Link href="/" className="mr-6 flex items-center space-x-2">
                    <Sailboat className="h-6 w-6 text-primary" />
                    <span className="font-bold sm:inline-block">
                    BlueRide Captain
                    </span>
                </Link>
            </div>
        </header>
        
        <main className="container mx-auto p-4 sm:p-6 md:p-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Captain's Dashboard</h1>
                <p className="text-muted-foreground">Welcome, {user?.displayName}. Here are your assigned trips. Select one to view the route to your passenger.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Trip Manifest</CardTitle>
                            <CardDescription>Select a trip to view details and route to pickup.</CardDescription>
                        </CardHeader>
                        <CardContent className="max-h-[60vh] overflow-y-auto">
                            {trips.length > 0 ? (
                                <div className="space-y-3">
                                {trips.map(trip => (
                                    <button key={trip._id} onClick={() => handleSelectTrip(trip)} className={`w-full text-left p-3 rounded-lg border transition-all ${selectedTrip?._id === trip._id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'}`}>
                                        <p className="font-semibold">{trip.boat.name}</p>
                                        <p className="text-sm"> <MapPin className="inline h-3 w-3 -mt-1"/> From: <span className="font-medium">{trip.pickup.name || 'Unknown'}</span></p>
                                        <p className="text-sm"> <MapPin className="inline h-3 w-3 -mt-1"/> To: <span className="font-medium">{trip.destination.name || 'Unknown'}</span></p>
                                        <p className="text-sm text-muted-foreground">Rider: {trip.rider.name}</p>
                                        <Badge variant="outline" className="mt-1">{trip.bookingType === 'seat' ? `${trip.seats} Seat(s)` : `Whole Boat`}</Badge>
                                    </button>
                                ))}
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground py-8">No trips assigned.</p>
                            )}
                        </CardContent>
                     </Card>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <div className="h-[50vh] w-full">
                         <InteractiveMap 
                            key={selectedTrip?._id || 'no-trip'} 
                            destination={destination}
                         />
                    </div>
                    {selectedTrip && isBriefingLoading && (
                        <Card>
                            <CardHeader><CardTitle>Loading First Mate Briefing...</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <Skeleton className="h-6 w-3/4"/>
                                <Skeleton className="h-4 w-1/2"/>
                                <Skeleton className="h-4 w-full"/>
                            </CardContent>
                        </Card>
                    )}
                    {briefing && selectedTrip && (
                         <Card>
                            <CardHeader>
                                <CardTitle>Passenger Trip Briefing: {selectedTrip.pickup.name} to {selectedTrip.destination.name}</CardTitle>
                                <CardDescription>Your AI-powered summary for the upcoming trip with the passenger.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2"><Cloudy/> Weather Forecast</h3>
                                    <div className="grid grid-cols-3 gap-2 text-sm">
                                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"><Wind size={16}/> <strong>Wind:</strong> {briefing.weather.wind}</div>
                                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"><Sailboat size={16}/> <strong>Waves:</strong> {briefing.weather.waves}</div>
                                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"><Eye size={16}/> <strong>Visibility:</strong> {briefing.weather.visibility}</div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2"><Navigation/> Navigation Advice</h3>
                                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">{briefing.advice}</p>
                                </div>

                                <div className="pt-4 flex justify-end gap-2">
                                     <Button variant="outline"><CheckSquare className="mr-2"/>Start Passenger Trip</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                     {!selectedTrip && (
                        <Card className="flex items-center justify-center h-48">
                            <p className="text-muted-foreground">Please select a trip to view route to passenger.</p>
                        </Card>
                    )}
                </div>
            </div>

        </main>
    </div>
  );
}
