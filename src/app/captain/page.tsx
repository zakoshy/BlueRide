
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Ship, User, Navigation, Wind, Eye, CheckSquare, Sailboat, MapPin, Cloudy, Users, LogOut } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { FirstMateOutput, FirstMateInput } from "@/ai/flows/first-mate-flow";
import { getFirstMateBriefing } from "@/ai/flows/first-mate-flow";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import InteractiveMap from "@/components/interactive-map";

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
  const [briefing, setBriefing] = useState<FirstMateOutput | null>(null);
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);
  const [route, setRoute] = useState<{ pickup: { lat: number; lng: number }; destination: { lat: number; lng: number } } | null>(null);


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

  const handleSelectJourney = async (journey: Journey) => {
    if (!journey.pickup?.name || !journey.destination?.name) {
        toast({
            title: "Journey Data Incomplete",
            description: "This journey is missing location data and cannot be displayed.",
            variant: "destructive"
        });
        setSelectedJourney(journey);
        setBriefing(null);
        setRoute(null);
        return;
    }

    setSelectedJourney(journey);
    setBriefing(null);
    setRoute(null);
    setIsBriefingLoading(true);

    try {
        const input: FirstMateInput = {
            pickup: journey.pickup.name,
            destination: journey.destination.name
        };
        const briefingData = await getFirstMateBriefing(input);
        setBriefing(briefingData);
        if (briefingData.route) {
            setRoute(briefingData.route);
        }

    } catch (error) {
        console.error("Error fetching briefing:", error);
        toast({ title: "Briefing Error", description: "Could not get AI First Mate briefing for this trip.", variant: "destructive" });
    } finally {
        setIsBriefingLoading(false);
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
                <p className="text-muted-foreground">Welcome, {user?.displayName}. Here are your assigned journeys. Select one to view the briefing.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Journey Manifest</CardTitle>
                            <CardDescription>Select a journey to view briefing.</CardDescription>
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
                                            <p className="text-xs font-semibold flex items-center gap-1"><Users size={14}/>Passenger Manifest ({journey.passengers.length})</p>
                                            <div className="text-xs text-muted-foreground pl-2 border-l ml-1">
                                            {journey.passengers.map(p => (
                                                <div key={p.bookingId}>{p.name} ({p.bookingType === 'seat' ? `${p.seats} seat(s)` : 'Whole boat'})</div>
                                            ))}
                                            </div>
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
                     <Card className="h-96">
                        <InteractiveMap route={route} />
                     </Card>
                    
                    {isBriefingLoading && !briefing && (
                        <Card>
                            <CardHeader><CardTitle>Loading First Mate Briefing...</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <Skeleton className="h-6 w-3/4"/>
                                <Skeleton className="h-4 w-1/2"/>
                                <Skeleton className="h-4 w-full"/>
                            </CardContent>
                        </Card>
                    )}

                    {briefing && selectedJourney && (
                         <Card>
                            <CardHeader>
                                <CardTitle>Journey Briefing: {selectedJourney.pickup.name} to {selectedJourney.destination.name}</CardTitle>
                                <CardDescription>Your AI-powered summary for the upcoming trip.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2"><Cloudy/> Weather Forecast</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
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
                                     <Button variant="outline"><CheckSquare className="mr-2"/>Start Journey</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                     {!selectedJourney && !isBriefingLoading && (
                         <Card className="flex items-center justify-center min-h-48">
                            <p className="text-muted-foreground">Please select a journey to view its briefing and route.</p>
                        </Card>
                    )}
                </div>
            </div>
        </main>
    </div>
  );
}

