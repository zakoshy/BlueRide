
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Ship, User as UserIcon, Sailboat, CreditCard, Radio } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/header";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


// Define types for our data structures
interface Location {
  _id: string;
  name: string;
  county: string;
  area: string;
}

interface ComboboxOption {
    value: string;
    label:string;
}

interface Boat {
  _id: string;
  name: string;
  capacity: number;
  licenseNumber: string;
  ownerId: string;
  isValidated: boolean;
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [locations, setLocations] = useState<ComboboxOption[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [pickup, setPickup] = useState<string>("");
  const [destination, setDestination] = useState<string>("");

  const [isFinding, setIsFinding] = useState(false);
  const [selectedBoat, setSelectedBoat] = useState<Boat | null>(null);
  const [bookingType, setBookingType] = useState<'seat' | 'whole_boat'>('seat');
  const [numSeats, setNumSeats] = useState(1);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [fare, setFare] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Fetch all available locations
    const fetchLocations = async () => {
      try {
        const response = await fetch('/api/routes');
        if (response.ok) {
          const data: Location[] = await response.json();
          setLocations(data.map(loc => ({ value: loc.name.toLowerCase(), label: `${loc.name} (${loc.area})` })));
        } else {
          toast({ title: "Error", description: "Could not fetch available locations.", variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Error", description: "An unexpected error occurred while fetching locations.", variant: "destructive" });
      }
    };
    fetchLocations();
  }, [toast]);
  
  const handleFindBoat = useCallback(async () => {
    if (!pickup || !destination) {
      toast({ title: "Missing Information", description: "Please select both a pickup and destination.", variant: "destructive" });
      return;
    }
     if (pickup === destination) {
      toast({ title: "Invalid Route", description: "Pickup and destination cannot be the same.", variant: "destructive" });
      return;
    }

    setIsFinding(true);
    setBoats([]);
    try {
      // For now, we fetch all validated boats.
      // A real application would filter boats based on the selected route.
      const response = await fetch(`/api/boats?validated=true`);
      if (response.ok) {
        const data = await response.json();
        setBoats(data);
        if (data.length === 0) {
           toast({ title: "No Boats Found", description: "There are currently no boats available for this route. Please check back later.", variant: "default" });
        }
      } else {
        toast({ title: "Error", description: "Could not fetch available boats.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "An unexpected error occurred while fetching boats.", variant: "destructive" });
    } finally {
      setIsFinding(false);
    }
  }, [pickup, destination, toast]);


  const handleBookingSubmit = async () => {
    if (!user || !selectedBoat || !pickup || !destination) {
        toast({ title: "Error", description: "Missing required information for booking.", variant: "destructive"});
        return;
    }
    
    // Simulate payment success before creating booking
     toast({
        title: "Payment Successful!",
        description: `Your payment of Ksh ${fare.toLocaleString()} has been processed.`,
    });
    
    const bookingDetails = {
        boatId: selectedBoat._id,
        riderId: user.uid,
        pickup: locations.find(l => l.value === pickup)?.label,
        destination: locations.find(l => l.value === destination)?.label,
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
            setPickup("");
            setDestination("");
        } else {
            const errorData = await response.json();
            toast({ title: "Booking Failed", description: errorData.message || "Could not complete booking.", variant: "destructive" });
        }
    } catch (error) {
        toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    }
  }
  
  const calculateFare = useCallback(() => {
    const calculatedFare = bookingType === 'whole_boat' ? 5000 : numSeats * 750;
    setFare(calculatedFare);
  }, [bookingType, numSeats]);


  useEffect(() => {
    if (isBookingDialogOpen) {
      calculateFare();
    }
  }, [isBookingDialogOpen, bookingType, numSeats, calculateFare]);


  const handleOpenBookingDialog = (boat: Boat) => {
    setSelectedBoat(boat);
    setIsBookingDialogOpen(true);
  }


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
              <CardDescription>Select your pickup and destination points to see available water taxis.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-2 md:gap-8">
                    <div className="grid w-full gap-1.5">
                        <Label htmlFor="from">From</Label>
                        <Combobox
                            options={locations.filter(l => l.value !== destination)}
                            selectedValue={pickup}
                            onSelect={setPickup}
                            placeholder="Select pickup..."
                            searchPlaceholder="Search locations..."
                            notFoundText="No locations found."
                        />
                    </div>
                     <div className="grid w-full gap-1.5">
                        <Label htmlFor="to">To</Label>
                         <Combobox
                            options={locations.filter(l => l.value !== pickup)}
                            selectedValue={destination}
                            onSelect={setDestination}
                            placeholder="Select destination..."
                            searchPlaceholder="Search locations..."
                            notFoundText="No locations found."
                        />
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleFindBoat} disabled={isFinding || !pickup || !destination}>
                    {isFinding ? "Searching..." : "Find a Boat"}
                </Button>
            </CardFooter>
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

          {boats.length > 0 && pickup && destination && (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold">Available Boats from <span className="text-primary">{locations.find(l=>l.value === pickup)?.label}</span> to <span className="text-primary">{locations.find(l=>l.value === destination)?.label}</span></h2>
                <div className="grid gap-6 md:grid-cols-2">
                    {boats.map(boat => (
                        <Card key={boat._id} className="flex flex-col cursor-pointer hover:border-primary transition-colors">
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
                                <Button className="w-full" onClick={() => handleOpenBookingDialog(boat)}>Book a trip</Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
          )}
        </div>
      </main>

       <Dialog open={isBookingDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) setSelectedBoat(null); setIsBookingDialogOpen(isOpen); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Book Your Trip on {selectedBoat?.name}</DialogTitle>
              <DialogDescription>
                Confirm your booking details and complete payment to reserve your ride.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
                 <div className="space-y-4 rounded-lg border p-4">
                     <p className="text-sm text-muted-foreground">
                        You are booking a trip from <span className="font-semibold text-primary">{locations.find(l=>l.value === pickup)?.label}</span> to <span className="font-semibold text-primary">{locations.find(l=>l.value === destination)?.label}</span>.
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

                 <div className="space-y-4">
                    <div className="flex justify-between items-center font-semibold text-lg">
                        <span>Total Fare:</span>
                        <span>Ksh {fare.toLocaleString()}</span>
                    </div>

                    <Tabs defaultValue="mpesa" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="mpesa">M-Pesa</TabsTrigger>
                            <TabsTrigger value="card">Card</TabsTrigger>
                            <TabsTrigger value="paypal">PayPal</TabsTrigger>
                        </TabsList>
                        <TabsContent value="mpesa" className="mt-4">
                             <Card className="p-4">
                                <p className="text-sm text-center text-muted-foreground">An STK push will be sent to your registered phone number to complete the payment.</p>
                            </Card>
                        </TabsContent>
                         <TabsContent value="card" className="mt-4">
                             <Card className="p-4 space-y-4">
                               <div className="space-y-2">
                                 <Label htmlFor="card-number">Card Number</Label>
                                 <Input id="card-number" placeholder="•••• •••• •••• ••••" />
                               </div>
                               <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="expiry">Expiry</Label>
                                    <Input id="expiry" placeholder="MM/YY" />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="cvc">CVC</Label>
                                    <Input id="cvc" placeholder="•••" />
                                </div>
                               </div>
                             </Card>
                        </TabsContent>
                         <TabsContent value="paypal" className="mt-4">
                             <Card className="p-4 text-center">
                                 <p className="text-sm text-muted-foreground mb-4">You will be redirected to PayPal to complete your payment securely.</p>
                                <Button variant="outline" className="w-full bg-blue-600 text-white hover:bg-blue-700 hover:text-white">
                                    <Radio className="mr-2"/> Continue with PayPal
                                </Button>
                             </Card>
                        </TabsContent>
                    </Tabs>

                 </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsBookingDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleBookingSubmit} className="w-full sm:w-auto">
                Pay Ksh {fare.toLocaleString()} & Confirm Booking
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
}

    