
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Ship, Anchor, Waves, ArrowRight, User as UserIcon, Calendar as CalendarIcon, Sailboat } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/header";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

// Define types for our data structures
interface Route {
  _id: string;
  name: string;
  pickup: string;
  destination: string;
}

interface Boat {
  _id: string;
  name: string;
  capacity: number;
  licenseNumber: string;
  ownerId: string;
  isValidated: boolean;
}

interface Booking {
    boatId: string;
    riderId: string;
    routeId: string;
    bookingType: 'seat' | 'whole_boat';
    seats?: number;
    status: 'pending' | 'confirmed' | 'cancelled';
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [routes, setRoutes] = useState<Route[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isFinding, setIsFinding] = useState(false);
  const [selectedBoat, setSelectedBoat] = useState<Boat | null>(null);
  const [bookingType, setBookingType] = useState<'seat' | 'whole_boat'>('seat');
  const [numSeats, setNumSeats] = useState(1);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Fetch all available routes on component mount
    const fetchRoutes = async () => {
      try {
        const response = await fetch('/api/routes');
        if (response.ok) {
          const data = await response.json();
          setRoutes(data);
        } else {
          toast({ title: "Error", description: "Could not fetch available routes.", variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Error", description: "An unexpected error occurred while fetching routes.", variant: "destructive" });
      }
    };
    fetchRoutes();
  }, [toast]);
  
  const handleFindBoat = useCallback(async (routeId: string | null) => {
    if (!routeId) {
      setBoats([]);
      return;
    }
    setIsFinding(true);
    setBoats([]);
    try {
      // In a real app, you'd fetch boats available for the selectedRouteId.
      // For now, we fetch all validated boats as a stand-in.
      const response = await fetch(`/api/boats?validated=true`);
      if (response.ok) {
        const data = await response.json();
        setBoats(data);
        if (data.length === 0) {
           toast({ title: "No Boats Found", description: "There are currently no boats available for this route.", variant: "secondary" });
        }
      } else {
        toast({ title: "Error", description: "Could not fetch available boats.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "An unexpected error occurred while fetching boats.", variant: "destructive" });
    } finally {
      setIsFinding(false);
    }
  }, [toast]);

  const handleRouteSelection = (routeId: string) => {
    setSelectedRouteId(routeId);
    handleFindBoat(routeId);
  }

  const handleBookingSubmit = async () => {
    if (!user || !selectedBoat || !selectedRouteId) {
        toast({ title: "Error", description: "Missing required information for booking.", variant: "destructive"});
        return;
    }

    const bookingDetails: Omit<Booking, 'status'> = {
        boatId: selectedBoat._id,
        riderId: user.uid,
        routeId: selectedRouteId,
        bookingType: bookingType,
        ...(bookingType === 'seat' && { seats: numSeats }),
    };

     try {
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingDetails),
        });

        if (response.ok) {
            toast({ title: "Booking Successful!", description: "Your request has been sent to the boat owner for confirmation." });
            setIsBookingDialogOpen(false);
            setSelectedBoat(null);
            setBoats([]);
            setSelectedRouteId(null);
        } else {
            const errorData = await response.json();
            toast({ title: "Booking Failed", description: errorData.message || "Could not complete booking.", variant: "destructive" });
        }
    } catch (error) {
        toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    }
  }

  const selectedRoute = useMemo(() => {
    return routes.find(r => r._id === selectedRouteId);
  }, [routes, selectedRouteId]);


  if (loading || !user) {
    return (
       <div className="flex min-h-dvh w-full items-center justify-center bg-secondary/50 p-4">
         <div className="w-full max-w-2xl space-y-6">
            <Skeleton className="h-8 w-48" />
            <Card>
              <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
              <CardContent className="space-y-4">
                 <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                 <Skeleton className="h-11 w-32" />
              </CardContent>
            </Card>
          </div>
       </div>
    )
  }

  return (
    <div className="min-h-dvh w-full bg-secondary/50">
      <Header />

      <main className="flex w-full items-start justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-4xl space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {user.displayName}!</h1>
            <p className="text-muted-foreground">Ready for your next adventure? Find your ride below.</p>
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sailboat/> Find Your Ride</CardTitle>
              <CardDescription>Select your route to see available water taxis.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid w-full gap-1.5">
                    <Label htmlFor="route">Select Your Route</Label>
                    <Select onValueChange={handleRouteSelection} value={selectedRouteId || undefined}>
                        <SelectTrigger id="route">
                            <SelectValue placeholder="Select a pickup and destination..." />
                        </SelectTrigger>
                        <SelectContent>
                            {routes.length > 0 ? routes.map(route => (
                                <SelectItem key={route._id} value={route._id}>
                                    <div className="flex items-center gap-2">
                                        <Anchor className="h-4 w-4 text-muted-foreground" />
                                        <span>{route.pickup}</span>
                                        <ArrowRight className="h-4 w-4" />
                                        <Waves className="h-4 w-4 text-muted-foreground" />
                                        <span>{route.destination}</span>
                                    </div>
                                </SelectItem>
                            )) : <SelectItem value="none" disabled>No routes available</SelectItem>}
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
          </Card>

          {isFinding && (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold">Searching for available boats...</h2>
                <div className="grid gap-6 md:grid-cols-2">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
          )}

          {boats.length > 0 && selectedRouteId && (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold">Available Boats for <span className="text-primary">{selectedRoute?.name}</span></h2>
                <div className="grid gap-6 md:grid-cols-2">
                    {boats.map(boat => (
                         <Dialog key={boat._id} onOpenChange={(isOpen) => { if (!isOpen) setSelectedBoat(null) }}>
                            <Card className="flex flex-col">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Ship />{boat.name}</CardTitle>
                                    <CardDescription>A reliable boat ready for your trip.</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1"><UserIcon/>Capacity: {boat.capacity}</div>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <DialogTrigger asChild>
                                        <Button className="w-full" onClick={() => setSelectedBoat(boat)}>Book a trip</Button>
                                    </DialogTrigger>
                                </CardFooter>
                            </Card>
                         </Dialog>
                    ))}
                </div>
            </div>
          )}
        </div>
      </main>

       <Dialog open={isBookingDialogOpen || !!selectedBoat} onOpenChange={(isOpen) => { if (!isOpen) setSelectedBoat(null); setIsBookingDialogOpen(isOpen); }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Book Your Trip on {selectedBoat?.name}</DialogTitle>
              <DialogDescription>
                Choose how you'd like to book and confirm your details.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <p className="text-sm text-muted-foreground">
                    You are booking a trip from <span className="font-semibold text-primary">{selectedRoute?.pickup}</span> to <span className="font-semibold text-primary">{selectedRoute?.destination}</span>.
                </p>
                <Select onValueChange={(value) => setBookingType(value as 'seat' | 'whole_boat')} defaultValue={bookingType}>
                    <SelectTrigger><SelectValue placeholder="Select booking type" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="seat">Book one or more seats</SelectItem>
                        <SelectItem value="whole_boat">Book the whole boat</SelectItem>
                    </SelectContent>
                </Select>

                {bookingType === 'seat' && (
                    <div className="grid gap-2">
                        <Label htmlFor="seats">Number of Seats</Label>
                        <Input 
                            id="seats" 
                            type="number" 
                            value={numSeats}
                            onChange={(e) => setNumSeats(Math.max(1, parseInt(e.target.value, 10)))}
                            min="1"
                            max={selectedBoat?.capacity}
                        />
                         <p className="text-xs text-muted-foreground">Max capacity: {selectedBoat?.capacity} seats.</p>
                    </div>
                )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setSelectedBoat(null)}>Cancel</Button>
              <Button onClick={handleBookingSubmit}>Confirm Booking</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
}
