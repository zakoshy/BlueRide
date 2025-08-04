
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Ship, User as UserIcon, Sailboat, CreditCard, BookCopy, Printer, Ticket } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/header";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReactToPrint } from 'react-to-print';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";


// Define types for our data structures
interface Location {
  _id: string;
  name: string;
  county: string;
  area: string;
  lat: number;
  lng: number;
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
  type: 'standard' | 'luxury' | 'speed';
}

interface Booking {
  _id: string;
  pickup: string;
  destination: string;
  status: 'pending' | 'confirmed' | 'completed' | 'rejected' | 'cancelled';
  createdAt: string;
  bookingType: 'seat' | 'whole_boat';
  seats?: number;
  baseFare: number;
  finalFare?: number;
  boat?: { name: string };
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [locations, setLocations] = useState<Location[]>([]);
  const [locationOptions, setLocationOptions] = useState<ComboboxOption[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [pickup, setPickup] = useState<string>("");
  const [destination, setDestination] = useState<string>("");

  const [isFinding, setIsFinding] = useState(false);
  const [selectedBoat, setSelectedBoat] = useState<Boat | null>(null);
  const [bookingType, setBookingType] = useState<'seat' | 'whole_boat'>('seat');
  const [numSeats, setNumSeats] = useState(1);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [baseFare, setBaseFare] = useState(0);
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState("");

  // Bookings History
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [isFetchingBookings, setIsFetchingBookings] = useState(false);
  const [receiptData, setReceiptData] = useState<Booking | null>(null);
  const receiptRef = useRef(null);

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    documentTitle: `BlueRide-Receipt-${receiptData?._id}`,
  });


  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const fetchUserBookings = useCallback(async () => {
    if (!user) return;
    setIsFetchingBookings(true);
    try {
        const response = await fetch(`/api/bookings?riderId=${user.uid}`);
        if(response.ok) {
            const data = await response.json();
            setUserBookings(data);
        } else {
            toast({ title: "Error", description: "Failed to fetch your booking history.", variant: "destructive" });
        }
    } catch(error) {
        toast({ title: "Error", description: "An unexpected error occurred while fetching your bookings.", variant: "destructive" });
    } finally {
        setIsFetchingBookings(false);
    }
  }, [user, toast]);

  useEffect(() => {
    // Fetch all available locations
    const fetchLocations = async () => {
      try {
        const response = await fetch('/api/routes');
        if (response.ok) {
          const data: Location[] = await response.json();
          setLocations(data);
          setLocationOptions(data.map(loc => ({ value: loc.name, label: `${loc.name} (${loc.area})` })));
        } else {
          toast({ title: "Error", description: "Could not fetch available locations.", variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Error", description: "An unexpected error occurred while fetching locations.", variant: "destructive" });
      }
    };
    fetchLocations();
    fetchUserBookings();
  }, [toast, fetchUserBookings]);
  
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
    
    const bookingDetails = {
        boatId: selectedBoat._id,
        riderId: user.uid,
        pickup: locationOptions.find(l => l.value === pickup)?.label,
        destination: locationOptions.find(l => l.value === destination)?.label,
        bookingType: bookingType,
        ...(bookingType === 'seat' && { seats: numSeats }),
        baseFare: baseFare,
    };

     try {
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingDetails),
        });

        if (response.ok) {
            toast({ title: "Booking Confirmed!", description: "Your trip is confirmed. Check 'My Bookings' for details and your receipt." });
            setIsBookingDialogOpen(false);
            setSelectedBoat(null);
            setBoats([]);
            setPickup("");
            setDestination("");
            fetchUserBookings(); // Refresh booking history
        } else {
            const errorData = await response.json();
            toast({ title: "Booking Failed", description: errorData.message || "Could not complete booking.", variant: "destructive" });
        }
    } catch (error) {
        toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    }
  }

  const handleOpenBookingDialog = async (boat: Boat) => {
    if (!pickup || !destination) {
      toast({ title: "Error", description: "Please select pickup and destination first.", variant: "destructive" });
      return;
    }
    setSelectedBoat(boat);
    setBaseFare(0); // Reset fare and show loading state
    setIsBookingDialogOpen(true);

    try {
      const response = await fetch(`/api/fare?pickup=${encodeURIComponent(pickup)}&destination=${encodeURIComponent(destination)}&boatType=${boat.type}`);
      if (response.ok) {
        const data = await response.json();
        setBaseFare(data.fare);
      } else {
        toast({ title: "Error", description: "Could not calculate fare for this trip.", variant: "destructive" });
        setIsBookingDialogOpen(false); // Close dialog on error
      }
    } catch (error) {
      toast({ title: "Error", description: "An unexpected error occurred while calculating the fare.", variant: "destructive" });
      setIsBookingDialogOpen(false); // Close dialog on error
    }
  };


  const handleViewReceipt = (booking: Booking) => {
    setReceiptData(booking);
    setTimeout(() => {
        handlePrint();
    }, 100);
  };

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
  
  const paidBookings = userBookings.filter(b => b.status === 'confirmed' || b.status === 'completed');
  const statusVariant = (status: Booking['status']) => {
    switch (status) {
        case 'confirmed': return 'default';
        case 'completed': return 'secondary';
        case 'rejected': return 'destructive';
        default: return 'outline';
    }
  };


  return (
    <div className="min-h-dvh w-full bg-secondary/50">
      <Header />

      <main className="flex w-full items-start justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-4xl space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {user.displayName}!</h1>
            <p className="text-muted-foreground">Ready for your next adventure? Find your ride or view your bookings below.</p>
          </div>

        <Tabs defaultValue="find-ride">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="find-ride">Find a Ride</TabsTrigger>
                <TabsTrigger value="my-bookings">My Bookings</TabsTrigger>
            </TabsList>

             <TabsContent value="find-ride">
                <Card className="shadow-lg mt-6">
                    <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Sailboat/> Find Your Ride</CardTitle>
                    <CardDescription>Select your pickup and destination points to see available water taxis.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 md:gap-8">
                            <div className="grid w-full gap-1.5">
                                <Label htmlFor="from">From</Label>
                                <Combobox
                                    options={locationOptions.filter(l => l.value !== destination)}
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
                                    options={locationOptions.filter(l => l.value !== pickup)}
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
                    <div className="space-y-4 mt-8">
                        <h2 className="text-2xl font-bold">Searching for available boats...</h2>
                        <div className="grid gap-6 md:grid-cols-2">
                            <Skeleton className="h-48 w-full" />
                            <Skeleton className="h-48 w-full" />
                        </div>
                    </div>
                )}

                {boats.length > 0 && pickup && destination && (
                    <div className="space-y-6 mt-8">
                        <h2 className="text-2xl font-bold">Available Boats from <span className="text-primary">{locationOptions.find(l=>l.value === pickup)?.label}</span> to <span className="text-primary">{locationOptions.find(l=>l.value === destination)?.label}</span></h2>
                        <div className="grid gap-6 md:grid-cols-2">
                            {boats.map(boat => (
                                <Card key={boat._id} className="flex flex-col">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2"><Ship />{boat.name}</CardTitle>
                                        <CardDescription>A reliable <span className="font-bold capitalize">{boat.type}</span> boat ready for your trip.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1"><UserIcon/>Capacity: {boat.capacity}</div>
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button className="w-full" onClick={() => handleOpenBookingDialog(boat)}>Request a trip</Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
             </TabsContent>

             <TabsContent value="my-bookings">
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BookCopy/>Your Booking History</CardTitle>
                        <CardDescription>Here are all your past and upcoming trips. You can print your receipt from here.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isFetchingBookings ? (
                           <div className="space-y-4">
                               <Skeleton className="h-16 w-full" />
                               <Skeleton className="h-16 w-full" />
                           </div>
                        ) : userBookings.length > 0 ? (
                            <div className="space-y-4">
                                {paidBookings.map(booking => (
                                    <Card key={booking._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4">
                                        <div>
                                            <p className="font-semibold text-primary">{booking.boat?.name || 'A boat'}</p>
                                            <p className="text-sm text-muted-foreground">From {booking.pickup} to {booking.destination}</p>
                                            <p className="text-xs text-muted-foreground">Booked on {new Date(booking.createdAt).toLocaleDateString()}</p>
                                            {booking.finalFare && <p className="text-xs font-bold">Fare: Ksh {booking.finalFare.toLocaleString()}</p>}
                                        </div>
                                         <div className="flex items-center gap-2 self-end sm:self-center">
                                            <Badge variant={statusVariant(booking.status)}>{booking.status}</Badge>
                                             {(booking.status === 'confirmed' || booking.status === 'completed') && (
                                                <Button variant="outline" size="sm" onClick={() => handleViewReceipt(booking)}>
                                                    <Printer className="mr-2 h-4 w-4"/> View Receipt
                                                </Button>
                                             )}
                                         </div>
                                    </Card>
                                ))}
                                {paidBookings.length === 0 && (
                                     <div className="text-center py-12">
                                        <Ticket className="mx-auto h-12 w-12 text-muted-foreground" />
                                        <h3 className="mt-4 text-lg font-medium">No Paid Bookings</h3>
                                        <p className="mt-1 text-sm text-muted-foreground">You have no confirmed or completed trips yet.</p>
                                     </div>
                                )}
                            </div>
                        ) : (
                             <div className="text-center py-12">
                                <Ticket className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-4 text-lg font-medium">No Bookings Yet</h3>
                                <p className="mt-1 text-sm text-muted-foreground">You haven't booked any trips. Find one today!</p>
                             </div>
                        )}
                    </CardContent>
                </Card>
             </TabsContent>

          </Tabs>
        </div>
      </main>

       <Dialog open={isBookingDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) setSelectedBoat(null); setIsBookingDialogOpen(isOpen); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Request a Trip on {selectedBoat?.name}</DialogTitle>
              <DialogDescription>
                Confirm your trip details and complete payment to book your ride.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] p-1">
                <div className="grid gap-6 py-4 px-3">
                    <div className="space-y-4 rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">
                            You are booking a trip from <span className="font-semibold text-primary">{locationOptions.find(l=>l.value === pickup)?.label}</span> to <span className="font-semibold text-primary">{locationOptions.find(l=>l.value === destination)?.label}</span>.
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
                    
                    <div className="space-y-2">
                        <div className="flex justify-between items-center font-semibold text-lg">
                            <span>Total Fare:</span>
                            <span>
                                {baseFare > 0 ? `Ksh ${baseFare.toLocaleString()}` : <Skeleton className="h-6 w-20 inline-block"/>}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">Final fare may be adjusted by the boat owner.</p>
                    </div>

                    <Tabs defaultValue="mpesa" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="card">Card</TabsTrigger>
                        <TabsTrigger value="mpesa">M-Pesa</TabsTrigger>
                        <TabsTrigger value="paypal">PayPal</TabsTrigger>
                        </TabsList>
                        <TabsContent value="card">
                        <div className="space-y-4 rounded-md border bg-card p-4">
                             <Button onClick={handleBookingSubmit} className="w-full" disabled={baseFare <= 0}>
                                Book Now (Pay Later)
                            </Button>
                        </div>
                        </TabsContent>
                        <TabsContent value="mpesa">
                        <div className="space-y-4 rounded-md border bg-card p-4">
                            <Label htmlFor="mpesa-phone">M-Pesa Phone Number</Label>
                            <Input id="mpesa-phone" placeholder="e.g. 0712345678" value={mpesaPhoneNumber} onChange={(e) => setMpesaPhoneNumber(e.target.value)} />
                            <Button onClick={handleBookingSubmit} className="w-full" disabled={baseFare <= 0 || !mpesaPhoneNumber}>
                                Complete Payment
                            </Button>
                            </div>
                        </TabsContent>
                        <TabsContent value="paypal">
                        <div className="space-y-4 rounded-md border bg-card p-4">
                            <Button onClick={handleBookingSubmit} className="w-full" disabled={baseFare <= 0}>
                                Book Now (Pay Later)
                            </Button>
                        </div>
                        </TabsContent>
                    </Tabs>

                </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsBookingDialogOpen(false)}>Cancel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Hidden printable receipt component */}
        <div className="hidden">
            {receiptData && (
                 <div ref={receiptRef} className="p-10 font-sans">
                    <div className="border-b-2 border-dashed pb-6 mb-6">
                        <div className="flex justify-between items-center">
                            <h1 className="text-4xl font-bold text-gray-800">BlueRide</h1>
                            <h2 className="text-2xl font-semibold">Booking Receipt</h2>
                        </div>
                        <p className="text-sm text-gray-500">Your reliable water ride.</p>
                    </div>
                    <div className="mb-8">
                        <h3 className="text-lg font-bold mb-2">Trip Details</h3>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                            <div><strong className="font-medium text-gray-600">Passenger:</strong> {user?.displayName}</div>
                            <div><strong className="font-medium text-gray-600">Booking ID:</strong> {receiptData._id}</div>
                            <div><strong className="font-medium text-gray-600">Boat Name:</strong> {receiptData.boat?.name}</div>
                            <div><strong className="font-medium text-gray-600">Date:</strong> {new Date(receiptData.createdAt).toLocaleString()}</div>
                        </div>
                    </div>
                     <div className="mb-8">
                        <h3 className="text-lg font-bold mb-2">Route Information</h3>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                            <div><strong className="font-medium text-gray-600">From:</strong> {receiptData.pickup}</div>
                            <div><strong className="font-medium text-gray-600">To:</strong> {receiptData.destination}</div>
                        </div>
                    </div>
                     <div className="mb-8 border-t pt-4">
                        <h3 className="text-lg font-bold mb-2">Booking Summary</h3>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                            <div><strong className="font-medium text-gray-600">Type:</strong> {receiptData.bookingType === 'seat' ? 'Seat Booking' : 'Whole Boat Charter'}</div>
                            {receiptData.seats && <div><strong className="font-medium text-gray-600">Seats:</strong> {receiptData.seats}</div>}
                            <div><strong className="font-medium text-gray-600">Status:</strong> <span className="font-bold uppercase text-green-600">{receiptData.status}</span></div>
                            {receiptData.finalFare && <div><strong className="font-medium text-gray-600">Final Fare:</strong> <span className="font-bold">Ksh {receiptData.finalFare.toLocaleString()}</span></div>}
                        </div>
                    </div>
                    <div className="text-center mt-10 border-t-2 border-dashed pt-6">
                        <p className="font-semibold">Thank you for choosing BlueRide!</p>
                        <p className="text-sm text-gray-500 mt-2">Please present this receipt upon boarding. Have a safe and pleasant journey.</p>
                    </div>
                 </div>
            )}
        </div>
    </div>
  );
}
