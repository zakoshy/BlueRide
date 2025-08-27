
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Ship, User, Navigation, Wind, Eye, CheckSquare, Sailboat, MapPin, Cloudy, Users, LogOut, BrainCircuit, Clock, Sun, ShieldAlert, Route as RouteIcon } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { getCaptainBriefing, type CaptainBriefingOutput } from "@/ai/flows/captain-briefing-flow";

interface Passenger {
    bookingId: string;
    name: string;
    uid: string;
    bookingType: 'seat' | 'whole_boat';
    seats?: number;
}

interface Journey {
    _id: string;
    boat: { _id: string; name: string; licenseNumber: string; };
    pickup: { name: string; lat: number; lng: number; };
    destination: { name: string; lat: number; lng: number; };
    passengers: Passenger[];
    tripDate: string;
}

export default function CaptainDashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isCaptain, setIsCaptain] = useState(false);
  const [loading, setLoading] = useState(true);

  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null);
  
  const [aiBriefing, setAiBriefing] = useState<CaptainBriefingOutput | null>(null);
  const [isStartingJourney, setIsStartingJourney] = useState(false);
 

  const fetchJourneys = useCallback(async (captainId: string) => {
    setLoading(true);
    try {
        const response = await fetch(`/api/captain/trips?captainId=${captainId}`);
        if(response.ok) {
            const data = await response.json();
            setJourneys(data);
        } else {
            toast({ title: "Error", description: "Could not fetch assigned journeys.", variant: "destructive" });
        }
    } catch (error) {
        console.error("Error fetching journeys:", error);
        toast({ title: "Error", description: "An unexpected error occurred while fetching journeys.", variant: "destructive" });
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
         fetchJourneys(user.uid);
      } else {
         setLoading(false);
      }
    } else {
      router.push('/profile');
    }
  }, [user, profile, authLoading, router, fetchJourneys]);

  const handleSelectJourney = (journey: Journey) => {
    setSelectedJourney(journey);
    setAiBriefing(null); // Clear previous briefing when selecting a new journey
  };
  
  const handleStartJourney = async () => {
    if (!selectedJourney) return;

    setIsStartingJourney(true);
    setAiBriefing(null);

    try {
        const briefing = await getCaptainBriefing({
            lat: selectedJourney.pickup.lat,
            long: selectedJourney.pickup.lng,
            destination: selectedJourney.destination.name
        });
        
        if (briefing) {
            setAiBriefing(briefing);
            toast({ title: "AI Briefing Received", description: "Pre-trip analysis is available below." });
        } else {
            throw new Error("Received an empty briefing from the AI agent.");
        }

    } catch (error: any) {
        console.error("Error getting AI briefing:", error);
        toast({ title: "Briefing Error", description: error.message || "Could not retrieve AI briefing from the agent.", variant: "destructive" });
    } finally {
        setIsStartingJourney(false);
    }
  };
  
  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "";
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }


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
  
  return (
    <div className="min-h-dvh w-full bg-secondary/50">
       <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center justify-between">
                <Link href="/" className="mr-6 flex items-center space-x-2">
                    <Sailboat className="h-6 w-6 text-primary" />
                    <span className="font-bold sm:inline-block">
                    BlueRide Captain
                    </span>
                </Link>
                <nav className="flex items-center gap-2">
                 {loading || !user ? (
                  <div className="h-10 w-28 animate-pulse rounded-md bg-muted" />
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
                          <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{user.displayName}</p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </nav>
            </div>
        </header>
        
        <main className="container mx-auto p-4 sm:p-6 md:p-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Captain's Dashboard</h1>
                <p className="text-muted-foreground">Welcome, {user?.displayName}. Here are your assigned journeys. Select one to view the details.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Journey Manifest</CardTitle>
                            <CardDescription>Select a journey to view the passenger list.</CardDescription>
                        </CardHeader>
                        <CardContent className="max-h-[60vh] overflow-y-auto">
                            {journeys.length > 0 ? (
                                <div className="space-y-3">
                                {journeys.map(journey => (
                                    <button key={journey._id} onClick={() => handleSelectJourney(journey)} className={`w-full text-left p-4 rounded-lg border transition-all ${selectedJourney?._id === journey._id ? 'bg-primary/10 border-primary shadow-lg' : 'hover:bg-muted/50'}`}>
                                        <p className="font-semibold">{journey.boat.name}</p>
                                        <p className="text-sm"> <MapPin className="inline h-3 w-3 -mt-1"/> From: <span className="font-medium">{journey.pickup.name || 'Unknown'}</span></p>
                                        <p className="text-sm"> <MapPin className="inline h-3 w-3 -mt-1"/> To: <span className="font-medium">{journey.destination.name || 'Unknown'}</span></p>
                                        <div className="mt-2">
                                            <p className="text-xs text-muted-foreground">Total Passengers: {journey.passengers.length}</p>
                                        </div>
                                    </button>
                                ))}
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground py-8">No journeys assigned.</p>
                            )}
                        </CardContent>
                     </Card>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    {selectedJourney ? (
                        <>
                         <Card>
                            <CardHeader>
                                <CardTitle>Trip Details: {selectedJourney.pickup.name} to {selectedJourney.destination.name}</CardTitle>
                                <CardDescription>Passenger manifest for boat: {selectedJourney.boat.name} ({selectedJourney.boat.licenseNumber})</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <ul className="divide-y">
                                    {selectedJourney.passengers.map(p => (
                                        <li key={p.bookingId} className="flex justify-between items-center py-2">
                                            <span className="font-medium">{p.name}</span>
                                            <span className="text-sm text-muted-foreground">{p.bookingType === 'seat' ? `${p.seats} seat(s)` : 'Whole boat'}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="pt-4 flex justify-end gap-2">
                                     <Button variant="outline" onClick={handleStartJourney} disabled={isStartingJourney}>
                                        {isStartingJourney ? "Getting Briefing..." : <><CheckSquare className="mr-2"/>Start Journey</>}
                                     </Button>
                                </div>
                            </CardContent>
                        </Card>
                        
                        {isStartingJourney && (
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-center space-x-2">
                                        <Skeleton className="h-5 w-5 rounded-full" />
                                        <p className="text-muted-foreground">Contacting AI agent for briefing...</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        
                        {aiBriefing && (
                             <Card className="animate-in fade-in-50">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><BrainCircuit className="text-primary"/> AI Agent Briefing</CardTitle>
                                    <CardDescription>Key information for your trip to {selectedJourney.destination.name}.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     <div>
                                        <h4 className="font-semibold flex items-center gap-2"><RouteIcon /> Route Summary</h4>
                                        <p className="text-sm text-muted-foreground pl-6">{aiBriefing.route_summary}</p>
                                    </div>
                                     <div>
                                        <h4 className="font-semibold flex items-center gap-2"><Clock /> Estimated Time of Arrival (ETA)</h4>
                                        <p className="text-sm text-muted-foreground pl-6">{aiBriefing.eta}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold flex items-center gap-2"><Cloudy /> Weather</h4>
                                        <p className="text-sm text-muted-foreground pl-6">{aiBriefing.weather}</p>
                                    </div>
                                     <div>
                                        <h4 className="font-semibold flex items-center gap-2"><ShieldAlert /> Safety Tips</h4>
                                        <p className="text-sm text-muted-foreground pl-6">{aiBriefing.safety_tips}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        </>

                    ) : (
                         <Card className="flex items-center justify-center min-h-96">
                            <div className="text-center">
                                <Sailboat className="mx-auto h-12 w-12 text-muted-foreground" />
                                <p className="mt-4 text-muted-foreground">Please select a journey to view its details.</p>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </main>
    </div>
  );
}
