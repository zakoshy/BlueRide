
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Ship, User as UserIcon, Sailboat, CreditCard, BookCopy, Printer, Ticket, Bot, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/header";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReactToPrint } from 'react-to-print';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import QRCode from 'qrcode';
import Image from "next/image";


// Define types for our data structures
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
  boat?: {
    name: string;
    capacity: number;
 };
}

type PaymentMethod = 'card' | 'mpesa' | 'paypal';


export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [pickupOptions, setPickupOptions] = useState<ComboboxOption[]>([]);
  const [destinationOptions, setDestinationOptions] = useState<ComboboxOption[]>([]);
  
  const [pickup, setPickup] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [boats, setBoats] = useState<Boat[]>([]);


  const [isFinding, setIsFinding] = useState(false);
  const [selectedBoat, setSelectedBoat] = useState<Boat | null>(null);
  const [bookingType, setBookingType] = useState<'seat' | 'whole_boat'>('seat');
  const [numSeats, setNumSeats] = useState(1);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [baseFare, setBaseFare] = useState(0);
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState("");
  const [activePaymentMethod, setActivePaymentMethod] = useState<PaymentMethod>('mpesa');


  // Bookings History
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [isFetchingBookings, setIsFetchingBookings] = useState(false);
  
  // Receipt State
  const [receiptData, setReceiptData] = useState<Booking | null>(null);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const receiptRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    documentTitle: `BlueRide-Receipt-${receiptData?._id || ''}`,
    onAfterPrint: () => toast({ title: "Print Complete", description: "Your receipt has been sent to the printer."}),
    onPrintError: () => toast({ title: "Print Error", description: "Could not print receipt. Please try again.", variant: "destructive" }),
  });

   const handleViewReceipt = async (booking: Booking) => {
    setReceiptData(booking);

    // --- Generate QR Code ---
    const ticketInfo = {
        bookingId: booking._id,
        passengerName: user?.displayName,
        from: booking.pickup,
        to: booking.destination,
        fare: booking.finalFare,
        date: booking.createdAt,
    };
    try {
        const qrUrl = await QRCode.toDataURL(JSON.stringify(ticketInfo));
        setQrCodeDataUrl(qrUrl);
    } catch (err) {
        console.error('Failed to generate QR code', err);
        setQrCodeDataUrl(''); // Clear any previous QR code
    }
    // --- End QR Code Generation ---

    setIsReceiptDialogOpen(true);
  };

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
    // Fetch all available pickup locations
    const fetchPickupLocations = async () => {
      try {
        const response = await fetch('/api/routes');
        if (response.ok) {
          const data: string[] = await response.json();
          // Use a Set to ensure unique locations before mapping
          const uniqueOptions = [...new Set(data)].map(loc => ({ value: loc, label: loc }));
          setPickupOptions(uniqueOptions);
        } else {
          toast({ title: "Error", description: "Could not fetch available pickup locations.", variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Error", description: "An unexpected error occurred while fetching locations.", variant: "destructive" });
      }
    };
    fetchPickupLocations();
    fetchUserBookings();
  }, [toast, fetchUserBookings]);

  // Fetch destinations when pickup changes
  useEffect(() => {
    if (!pickup) {
        setDestinationOptions([]);
        setDestination("");
        return;
    }
    const fetchDestinations = async () => {
        try {
             const response = await fetch(`/api/routes?from=${pickup}`);
             if (response.ok) {
                const data: string[] = await response.json();
                setDestinationOptions(data.map(loc => ({ value: loc, label: loc })));
             } else {
                toast({ title: "Error", description: "Could not fetch destinations for this route.", variant: "destructive" });
             }
        } catch (error) {
             toast({ title: "Error", description: "An unexpected error occurred while fetching destinations.", variant: "destructive" });
        }
    }
    fetchDestinations();
  }, [pickup, toast]);


  const handleFindBoat = useCallback(async () => {
    if (!pickup || !destination) {
      toast({ title: "Missing Information", description: "Please select both a pickup and destination.", variant: "destructive" });
      return;
    }

    setIsFinding(true);
    setBoats([]);
    try {
      // 1. Get the fare for the selected route
      const fareResponse = await fetch(`/api/fare?pickup=${pickup}&destination=${destination}`);
      if (!fareResponse.ok) {
        throw new Error("This route is not available. Please select another.");
      }
      const fareData = await fareResponse.json();
      setBaseFare(fareData.fare);

      // 2. Fetch all validated boats (a real app would filter by route/availability)
      const boatsResponse = await fetch(`/api/boats?validated=true`);
      if (boatsResponse.ok) {
        const boatsData = await boatsResponse.json();
        setBoats(boatsData);
        if (boatsData.length === 0) {
           toast({ title: "No Boats Found", description: "There are currently no boats available for this route. Please check back later.", variant: "default" });
        }
      } else {
        toast({ title: "Error", description: "Could not fetch available boats.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "An unexpected error occurred while fetching boats.", variant: "destructive" });
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
        pickup: pickup,
        destination: destination,
        bookingType: bookingType,
        ...(bookingType === 'seat' && { seats: numSeats }),
        baseFare: bookingType === 'seat' ? baseFare * numSeats : baseFare * selectedBoat.capacity,
    };

     try {
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingDetails),
        });

        if (response.ok) {
            let toastMessage = "Your trip is confirmed. Check 'My Bookings' for details and your receipt.";
            if (activePaymentMethod === 'card') {
                toastMessage = "Booking Confirmed! Your Card has been authorized.";
            } else if (activePaymentMethod === 'paypal') {
                toastMessage = "Booking Confirmed via PayPal!";
            } else {
                 toastMessage = `Booking Confirmed! A request will be sent to ${mpesaPhoneNumber} to complete payment.`
            }

            toast({ title: "Booking Confirmed!", description: toastMessage });

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

  const handleOpenBookingDialog = (boat: Boat) => {
    setSelectedBoat(boat);
    setIsBookingDialogOpen(true);
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!user) return;
    try {
        const response = await fetch(`/api/bookings?bookingId=${bookingId}&riderId=${user.uid}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            toast({ title: "Booking Cancelled", description: "Your booking has been successfully cancelled." });
            fetchUserBookings(); // Refresh the list
        } else {
            const errorData = await response.json();
            toast({ title: "Cancellation Failed", description: errorData.message || "Could not cancel booking.", variant: "destructive" });
        }
    } catch (error) {
        toast({ title: "Error", description: "An unexpected error occurred while cancelling the booking.", variant: "destructive" });
    }
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
  
  const statusVariant = (status: Booking['status']) => {
    switch (status) {
        case 'confirmed': return 'default';
        case 'completed': return 'secondary';
        case 'rejected': return 'destructive';
        default: return 'outline';
    }
  };
  
  const calculatedFare = bookingType === 'seat' 
    ? baseFare * numSeats 
    : selectedBoat 
    ? baseFare * selectedBoat.capacity
    : 0;


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
                                    options={pickupOptions}
                                    selectedValue={pickup}
                                    onSelect={(value) => {
                                        setPickup(value);
                                        setDestination(''); // Reset destination when pickup changes
                                        setBoats([]); // Clear previous results
                                    }}
                                    placeholder="Select pickup..."
                                    searchPlaceholder="Search locations..."
                                    notFoundText="No locations found."
                                />
                            </div>
                            <div className="grid w-full gap-1.5">
                                <Label htmlFor="to">To</Label>
                                <Combobox
                                    options={destinationOptions}
                                    selectedValue={destination}
                                    onSelect={(value) => {
                                        setDestination(value);
                                        setBoats([]); // Clear previous results
                                    }}
                                    placeholder="Select destination..."
                                    searchPlaceholder="Search locations..."
                                    notFoundText="No destinations found."
                                    disabled={!pickup}
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
                        <h2 className="text-2xl font-bold">Available Boats from <span className="text-primary">{pickup}</span> to <span className="text-primary">{destination}</span></h2>
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
                                         <p className="text-lg font-bold mt-2">Ksh {baseFare.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/seat</span></p>
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
                        <CardDescription>Here are all your past and upcoming trips. You can view or print your receipt from here.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isFetchingBookings ? (
                           <div className="space-y-4">
                               <Skeleton className="h-16 w-full" />
                               <Skeleton className="h-16 w-full" />
                           </div>
                        ) : userBookings.length > 0 ? (
                            <div className="space-y-4">
                                {userBookings.map(booking => (
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
                                                    <Printer className="mr-2 h-4 w-4"/>
                                                    View Receipt
                                                </Button>
                                             )}
                                            {(booking.status !== 'completed' && booking.status !== 'cancelled') && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" size="icon">
                                                        <Trash2 className="h-4 w-4" />
                                                        <span className="sr-only">Cancel Booking</span>
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will permanently cancel your booking. This action cannot be undone.
                                                    </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                    <AlertDialogCancel>Go Back</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleCancelBooking(booking._id)}>
                                                        Yes, Cancel Booking
                                                    </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                            )}
                                         </div>
                                    </Card>
                                ))}
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
                            You are booking a trip from <span className="font-semibold text-primary">{pickup}</span> to <span className="font-semibold text-primary">{destination}</span>.
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
                                    onChange={(e) => setNumSeats(Math.max(1, parseInt(e.target.value, 10) || 1))}
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
                                {calculatedFare > 0 ? `Ksh ${calculatedFare.toLocaleString()}` : <Skeleton className="h-6 w-20 inline-block"/>}
                            </span>
                        </div>
                         {bookingType === 'whole_boat' && selectedBoat && <p className="text-xs text-muted-foreground text-center">Booking the whole boat covers all {selectedBoat.capacity} seats.</p>}
                    </div>

                    <Tabs defaultValue="mpesa" className="w-full" onValueChange={(v) => setActivePaymentMethod(v as PaymentMethod)}>
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="card">Card</TabsTrigger>
                            <TabsTrigger value="mpesa">M-Pesa</TabsTrigger>
                            <TabsTrigger value="paypal">PayPal</TabsTrigger>
                        </TabsList>
                        <TabsContent value="card">
                            <div className="space-y-4 rounded-md border bg-card p-4">
                               <div className="space-y-2">
                                    <Label htmlFor="card-number">Card Number</Label>
                                    <Input id="card-number" placeholder="0000 0000 0000 0000"/>
                               </div>
                                <div className="grid grid-cols-2 gap-4">
                                     <div className="space-y-2">
                                        <Label htmlFor="expiry">Expiry</Label>
                                        <Input id="expiry" placeholder="MM/YY"/>
                                     </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="cvc">CVC</Label>
                                        <Input id="cvc" placeholder="123"/>
                                     </div>
                                </div>
                                <Button onClick={handleBookingSubmit} className="w-full" disabled={calculatedFare <= 0}>
                                    Complete Payment
                                </Button>
                            </div>
                        </TabsContent>
                        <TabsContent value="mpesa">
                            <div className="space-y-4 rounded-md border bg-card p-4">
                                <Label htmlFor="mpesa-phone">M-Pesa Phone Number</Label>
                                <Input id="mpesa-phone" placeholder="e.g. 0712345678" value={mpesaPhoneNumber} onChange={(e) => setMpesaPhoneNumber(e.target.value)} />
                                <Button onClick={handleBookingSubmit} className="w-full" disabled={calculatedFare <= 0 || !mpesaPhoneNumber}>
                                    Complete Payment
                                </Button>
                            </div>
                        </TabsContent>
                        <TabsContent value="paypal">
                            <div className="space-y-4 rounded-md border bg-card p-4 text-center">
                               <p className="text-sm text-muted-foreground">You will be redirected to PayPal to complete your purchase securely.</p>
                               <Button onClick={handleBookingSubmit} className="w-full" disabled={calculatedFare <= 0}>
                                   <CreditCard className="mr-2 h-4 w-4"/> Continue with PayPal
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
        
        {/* Receipt Dialog */}
        <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Booking Receipt</DialogTitle>
                    <DialogDescription>Your scannable ticket. You can print this or save it as a PDF.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] py-4">
                    {/* This inner div is what gets printed */}
                    <div ref={receiptRef} className="p-4 rounded-lg border bg-background text-foreground">
                        <div className="flex justify-between items-center pb-4 mb-4 border-b">
                            <div>
                                <h3 className="text-xl font-bold text-primary">BlueRide</h3>
                                <p className="text-xs text-muted-foreground">Thank you for riding with us!</p>
                            </div>
                             <Sailboat className="h-8 w-8 text-primary" />
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                <p><strong className="font-medium text-muted-foreground">Passenger:</strong></p>
                                <p className="text-right">{user?.displayName}</p>
                                
                                <p><strong className="font-medium text-muted-foreground">Booking ID:</strong></p>
                                <p className="text-right font-mono text-xs">{receiptData?._id}</p>
                                
                                <p><strong className="font-medium text-muted-foreground">Boat Name:</strong></p>
                                <p className="text-right">{receiptData?.boat?.name}</p>

                                <p><strong className="font-medium text-muted-foreground">Date:</strong></p>
                                <p className="text-right">{receiptData ? new Date(receiptData.createdAt).toLocaleString() : 'N/A'}</p>
                            </div>
                            <Separator />
                             <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                <p><strong className="font-medium text-muted-foreground">From:</strong></p>
                                <p className="text-right font-semibold">{receiptData?.pickup}</p>
                                <p><strong className="font-medium text-muted-foreground">To:</strong></p>
                                <p className="text-right font-semibold">{receiptData?.destination}</p>
                             </div>
                             <Separator/>
                             <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                <p><strong className="font-medium text-muted-foreground">Booking Type:</strong></p>
                                <p className="text-right">{receiptData?.bookingType === 'seat' ? `Seat(s): ${receiptData.seats}` : 'Whole Boat'}</p>
                                
                                <p><strong className="font-medium text-muted-foreground">Status:</strong></p>
                                <p className="text-right capitalize font-bold">{receiptData?.status}</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-3 mt-4 flex justify-between items-center">
                                <p className="text-lg font-bold">Total Fare Paid:</p>
                                <p className="text-lg font-bold">Ksh {receiptData?.finalFare?.toLocaleString()}</p>
                            </div>
                        </div>

                        {qrCodeDataUrl && (
                            <div className="flex flex-col items-center my-4 pt-4 border-t">
                                <Image src={qrCodeDataUrl} alt="Booking QR Code" width={160} height={160} />
                                <p className="text-sm text-muted-foreground mt-2">Scan upon boarding</p>
                            </div>
                        )}

                         <div className="text-center mt-6 text-xs text-muted-foreground">
                            <p>Please present this receipt upon boarding. Have a safe and pleasant journey.</p>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsReceiptDialogOpen(false)}>Close</Button>
                    <Button onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print / Download
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}

