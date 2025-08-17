
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Ship, User as UserIcon, Sailboat, CreditCard, BookCopy, Printer, Ticket, Bot, Trash2, Star, Rocket, Gem, HelpCircle, Briefcase, Weight, MapPin } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";


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
  description: string;
  homeCounty?: string;
}

interface Booking {
  _id: string;
  pickup: string;
  destination: string;
  status: 'pending' | 'confirmed' | 'completed' | 'rejected' | 'cancelled';
  createdAt: string;
  bookingType: 'seat' | 'whole_boat' | 'charter';
  seats?: number;
  duration?: number;
  baseFare: number;
  finalFare?: number;
  luggageFee?: number;
  hasBeenReviewed?: boolean;
  boat?: {
    name: string;
    capacity: number;
 };
}

type PaymentMethod = 'card' | 'mpesa' | 'paypal';
type ServiceType = 'trip' | 'charter';

const LUGGAGE_FEE = 250;
const LUGGAGE_WEIGHT_THRESHOLD = 15;

const counties = [
    { value: 'Mombasa', label: 'Mombasa' },
    { value: 'Kwale', label: 'Kwale' },
    { value: 'Kilifi', label: 'Kilifi' },
    { value: 'Lamu', label: 'Lamu' },
];

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [pickupOptions, setPickupOptions] = useState<ComboboxOption[]>([]);
  const [destinationOptions, setDestinationOptions] = useState<ComboboxOption[]>([]);
  
  const [pickup, setPickup] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [boats, setBoats] = useState<Boat[]>([]);

  const [activeService, setActiveService] = useState<ServiceType>('trip');
  const [isFinding, setIsFinding] = useState(false);
  const [selectedBoat, setSelectedBoat] = useState<Boat | null>(null);
  
  // Trip booking state
  const [bookingType, setBookingType] = useState<'seat' | 'whole_boat'>('seat');
  const [numSeats, setNumSeats] = useState(1);
  const [baseFare, setBaseFare] = useState(0);
  const [hasLuggage, setHasLuggage] = useState(false);
  const [luggageWeight, setLuggageWeight] = useState(0);

  // Charter booking state
  const [charterDuration, setCharterDuration] = useState(1);
  const [charterCounty, setCharterCounty] = useState<string>("");
  const HOURLY_RATE_LUXURY = 15000;
  const HOURLY_RATE_SPEED = 10000;

  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState("");
  const [activePaymentMethod, setActivePaymentMethod] = useState<PaymentMethod>('mpesa');


  // Bookings History
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [isFetchingBookings, setIsFetchingBookings] = useState(false);
  
  // Receipt State
  const receiptRef = useRef<HTMLDivElement>(null);
  const [receiptData, setReceiptData] = useState<Booking | null>(null);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  
  // Review State
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  
  // Refund State
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [refundBooking, setRefundBooking] = useState<Booking | null>(null);
  const [refundReason, setRefundReason] = useState("");

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    documentTitle: `BlueRide-Receipt-${receiptData?._id || ''}`,
    onAfterPrint: () => toast({ title: "Print Complete", description: "Your receipt has been sent to the printer."}),
    onPrintError: () => toast({ title: "Print Error", description: "Could not print receipt. Please try again.", variant: "destructive" }),
  });
  
  const calculatedLuggageFee = useMemo(() => {
    return hasLuggage && luggageWeight >= LUGGAGE_WEIGHT_THRESHOLD ? LUGGAGE_FEE : 0;
  }, [hasLuggage, luggageWeight]);

  const calculatedFare = useMemo(() => {
    let fare = 0;
    if (activeService === 'trip') {
        const tripFare = bookingType === 'seat' ? baseFare * numSeats : (selectedBoat ? baseFare * selectedBoat.capacity : 0);
        fare = tripFare + calculatedLuggageFee;
    } else { // Charter
        fare = selectedBoat ? (selectedBoat.type === 'luxury' ? HOURLY_RATE_LUXURY : HOURLY_RATE_SPEED) * charterDuration : 0;
    }
    return fare;
  }, [activeService, bookingType, baseFare, numSeats, selectedBoat, calculatedLuggageFee, charterDuration]);

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

  const handleFindBoats = useCallback(async () => {
    setIsFinding(true);
    setBoats([]);
    
    let apiUrl = '/api/boats?validated=true';

    if (activeService === 'trip') {
        if (!pickup || !destination) {
          toast({ title: "Missing Information", description: "Please select both a pickup and destination.", variant: "destructive" });
          setIsFinding(false);
          return;
        }
        try {
            const fareResponse = await fetch(`/api/fare?pickup=${pickup}&destination=${destination}`);
            if (!fareResponse.ok) throw new Error("This route is not available. Please select another.");
            const fareData = await fareResponse.json();
            setBaseFare(fareData.fare);
            apiUrl += `&routeId=${fareData.routeId}&type=standard`;
        } catch (error: any) {
             toast({ title: "Error", description: error.message || "An unexpected error occurred while fetching route data.", variant: "destructive" });
             setIsFinding(false);
             return;
        }
    } else { // Charter service
        if (!charterCounty) {
          toast({ title: "Missing Information", description: "Please select a county for your charter.", variant: "destructive" });
          setIsFinding(false);
          return;
        }
        apiUrl += `&type=luxury,speed&county=${charterCounty}`;
    }

    try {
      const boatsResponse = await fetch(apiUrl);
      if (boatsResponse.ok) {
        const boatsData = await boatsResponse.json();
        setBoats(boatsData);
        if (boatsData.length === 0) {
           toast({ title: "No Boats Found", description: `There are currently no ${activeService === 'trip' ? 'boats' : 'charters'} available for your selection. Please check back later.`, variant: "default" });
        }
      } else {
        toast({ title: "Error", description: "Could not fetch available boats.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "An unexpected error occurred while fetching boats.", variant: "destructive" });
    } finally {
      setIsFinding(false);
    }
  }, [pickup, destination, toast, activeService, charterCounty]);
  
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);


  useEffect(() => {
    // Fetch all available pickup locations
    const fetchPickupLocations = async () => {
      try {
        const response = await fetch('/api/routes');
        if (response.ok) {
          const data: string[] = await response.json();
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
  }, [fetchUserBookings, toast]);

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

  const handleBookingSubmit = async (finalFare: number, currentLuggageFee: number) => {
    if (!user || !selectedBoat) {
        toast({ title: "Error", description: "Missing required information for booking.", variant: "destructive"});
        return;
    }

    let bookingDetails: any;

    if (activeService === 'trip') {
        bookingDetails = {
            boatId: selectedBoat._id,
            riderId: user.uid,
            pickup: pickup,
            destination: destination,
            bookingType: bookingType,
            baseFare: bookingType === 'seat' ? baseFare * numSeats : baseFare * selectedBoat.capacity,
            finalFare: finalFare,
            luggageWeight: luggageWeight,
            luggageFee: currentLuggageFee,
            ...(bookingType === 'seat' && { seats: numSeats }),
        };
    } else { // Charter
         bookingDetails = {
            boatId: selectedBoat._id,
            riderId: user.uid,
            pickup: "Private Charter", // Or some other signifier
            destination: `${charterDuration} hour(s) in ${charterCounty}`,
            bookingType: 'charter',
            duration: charterDuration,
            baseFare: finalFare,
            finalFare: finalFare,
            luggageFee: 0,
            luggageWeight: 0,
        };
    }


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
            setCharterCounty("");
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
    setHasLuggage(false);
    setLuggageWeight(0);
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

    const handleOpenReviewDialog = (booking: Booking) => {
        setReviewBooking(booking);
        setRating(0);
        setComment("");
        setIsReviewDialogOpen(true);
    };

    const handleReviewSubmit = async () => {
        if (!reviewBooking || rating === 0) {
            toast({
                title: "Incomplete Review",
                description: "Please provide a star rating to submit your review.",
                variant: "destructive",
            });
            return;
        }

        try {
            const response = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingId: reviewBooking._id,
                    rating: rating,
                    comment: comment,
                }),
            });

            if (response.ok) {
                toast({ title: "Review Submitted", description: "Thank you for your feedback!" });
                setIsReviewDialogOpen(false);
                fetchUserBookings(); // Refresh bookings to update review status
            } else {
                const errorData = await response.json();
                toast({
                    title: "Review Failed",
                    description: errorData.message || "Could not submit your review.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "An unexpected error occurred while submitting your review.",
                variant: "destructive",
            });
        }
    };
    
    const handleOpenRefundDialog = (booking: Booking) => {
        setRefundBooking(booking);
        setRefundReason("");
        setIsRefundDialogOpen(true);
    };
    
    const handleRefundSubmit = async () => {
        if (!refundBooking || !refundReason) {
            toast({ title: "Incomplete Request", description: "Please provide a reason for your refund request.", variant: "destructive" });
            return;
        }
        // In a real app, this would call a backend API.
        // For now, we simulate success and close the dialog.
        console.log(`Refund requested for booking ${refundBooking._id}: ${refundReason}`);
        toast({ title: "Request Submitted", description: "Your refund request has been submitted for review. You will be notified of the outcome." });
        setIsRefundDialogOpen(false);
    };

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

             <TabsContent value="find-ride" className="mt-6">
                <Card className="shadow-lg">
                    <CardHeader>
                        <Tabs value={activeService} onValueChange={(v) => {setActiveService(v as ServiceType); setBoats([])}} className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="trip">Book a Trip</TabsTrigger>
                            <TabsTrigger value="charter">Charter a Boat</TabsTrigger>
                          </TabsList>
                          <TabsContent value="trip" className="mt-4">
                             <CardDescription className="mb-4">Select your pickup and destination points to see available water taxis.</CardDescription>
                                <div className="grid gap-4 md:grid-cols-2 md:gap-8">
                                    <div className="grid w-full gap-1.5">
                                        <Label htmlFor="from">From</Label>
                                        <Combobox
                                            options={pickupOptions}
                                            selectedValue={pickup}
                                            onSelect={(value) => {
                                                setPickup(value);
                                                setDestination(''); 
                                                setBoats([]);
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
                                                setBoats([]);
                                            }}
                                            placeholder="Select destination..."
                                            searchPlaceholder="Search locations..."
                                            notFoundText="No destinations found."
                                            disabled={!pickup}
                                        />
                                    </div>
                                </div>
                                <Button onClick={handleFindBoats} disabled={isFinding || !pickup || !destination} className="mt-4">
                                    {isFinding ? "Searching..." : "Find a Boat"}
                                </Button>
                          </TabsContent>
                          <TabsContent value="charter" className="mt-4">
                            <CardDescription className="mb-4">Hire our exclusive fleet of luxury and speed boats by the hour. First, select your county.</CardDescription>
                                <div className="grid gap-4 md:grid-cols-2 md:gap-8">
                                    <div className="grid w-full gap-1.5">
                                        <Label htmlFor="county">Select County</Label>
                                        <Select onValueChange={setCharterCounty} value={charterCounty}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a county" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {counties.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                 <Button onClick={handleFindBoats} disabled={isFinding || !charterCounty} className="mt-4">
                                    {isFinding ? "Searching..." : "Find a Charter Boat"}
                                </Button>
                          </TabsContent>
                        </Tabs>
                    </CardHeader>
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

                {boats.length > 0 && (
                    <div className="space-y-6 mt-8">
                         <h2 className="text-2xl font-bold">
                            {activeService === 'trip' 
                                ? <><>Available Boats for: </> <span className="text-primary">{pickup}</span> <>to </> <span className="text-primary">{destination}</span></>
                                : <>Available Charters in <span className="text-primary">{charterCounty}</span></>
                            }
                        </h2>
                        <div className="grid gap-6 md:grid-cols-2">
                            {boats.map(boat => (
                                <Card key={boat._id} className="flex flex-col">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            {boat.type === 'luxury' && <Gem className="text-purple-500"/>}
                                            {boat.type === 'speed' && <Rocket className="text-orange-500"/>}
                                            {boat.type === 'standard' && <Ship />}
                                            {boat.name}
                                        </CardTitle>
                                        <CardDescription>{boat.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1"><UserIcon/>Capacity: {boat.capacity}</div>
                                            {boat.homeCounty && <div className="flex items-center gap-1"><MapPin/>{boat.homeCounty}</div>}
                                        </div>
                                         <p className="text-lg font-bold mt-2">
                                            {activeService === 'trip'
                                                ? <>Ksh {baseFare.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/seat</span></>
                                                : <>Ksh {(boat.type === 'luxury' ? HOURLY_RATE_LUXURY : HOURLY_RATE_SPEED).toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/hour</span></>
                                            }
                                         </p>
                                    </CardContent>
                                    <CardFooter>
                                        <Button className="w-full" onClick={() => handleOpenBookingDialog(boat)}>
                                           {activeService === 'trip' ? "Request a Trip" : "Request to Charter"}
                                        </Button>
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
                        <CardDescription>Here are all your past and upcoming trips. You can view your receipt or leave a review.</CardDescription>
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
                                    <Card key={booking._id} className="flex flex-col sm:flex-row items-start justify-between p-4 gap-4">
                                        <div>
                                            <p className="font-semibold text-primary">{booking.boat?.name || 'A boat'}</p>
                                            <p className="text-sm text-muted-foreground">
                                                 {booking.bookingType === 'charter' 
                                                    ? <>Private Charter ({booking.destination})</>
                                                    : <>From {booking.pickup} to {booking.destination}</>
                                                }
                                            </p>
                                            <p className="text-xs text-muted-foreground">Booked on {new Date(booking.createdAt).toLocaleDateString()}</p>
                                            {booking.finalFare && <p className="text-xs font-bold">Fare: Ksh {booking.finalFare.toLocaleString()}</p>}
                                        </div>
                                         <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                                            <Badge variant={statusVariant(booking.status)}>{booking.status}</Badge>
                                             {(booking.status === 'confirmed' || booking.status === 'completed') && (
                                                <Button variant="outline" size="sm" onClick={() => handleViewReceipt(booking)}>
                                                    <Printer className="mr-2 h-4 w-4"/>
                                                    Receipt
                                                </Button>
                                             )}
                                              {booking.status === 'completed' && (
                                                <Button variant="ghost" size="sm" onClick={() => handleOpenRefundDialog(booking)}>
                                                    <HelpCircle className="mr-2 h-4 w-4"/>
                                                    Request Refund
                                                </Button>
                                             )}
                                             {booking.status === 'completed' && !booking.hasBeenReviewed && (
                                                <Button variant="default" size="sm" onClick={() => handleOpenReviewDialog(booking)}>
                                                    <Star className="mr-2 h-4 w-4" />
                                                    Leave Review
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
                                                        This will permanently cancel your booking. A 30% cancellation fee will be applied.
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
              <DialogTitle>Request a {activeService === 'trip' ? 'Trip' : 'Charter'} on {selectedBoat?.name}</DialogTitle>
              <DialogDescription>
                Confirm your details and complete payment to book your ride.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] p-1">
                <div className="grid gap-6 py-4 px-3">
                    {activeService === 'trip' ? (
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

                            <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="luggage" checked={hasLuggage} onCheckedChange={(checked) => setHasLuggage(!!checked)}/>
                                    <Label htmlFor="luggage" className="cursor-pointer">I have luggage</Label>
                                </div>
                                {hasLuggage && (
                                     <div className="grid gap-2 pl-6">
                                        <Label htmlFor="luggage-weight">Luggage Weight (kg)</Label>
                                        <Input
                                            id="luggage-weight"
                                            type="number"
                                            value={luggageWeight}
                                            onChange={(e) => setLuggageWeight(parseInt(e.target.value, 10) || 0)}
                                            min="0"
                                        />
                                        <p className="text-xs text-muted-foreground">A fee of Ksh {LUGGAGE_FEE} applies for luggage {LUGGAGE_WEIGHT_THRESHOLD}kg or more.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                         <div className="space-y-4 rounded-lg border p-4">
                             <p className="text-sm text-muted-foreground">
                                You are chartering the <span className="font-semibold text-primary">{selectedBoat?.name}</span> in <span className="font-semibold text-primary">{charterCounty}</span>.
                            </p>
                             <div className="grid gap-2">
                                <Label htmlFor="duration">Booking Duration (hours)</Label>
                                <Input
                                    id="duration"
                                    type="number"
                                    value={charterDuration}
                                    onChange={(e) => setCharterDuration(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                    min="1"
                                />
                            </div>
                         </div>
                    )}


                    <div className="space-y-2">
                         {calculatedLuggageFee > 0 && (
                            <div className="flex justify-between items-center text-sm">
                                <span>Luggage Fee:</span>
                                <span>Ksh {calculatedLuggageFee.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center font-semibold text-lg">
                            <span>Total Fare:</span>
                            <span>
                                {calculatedFare > 0 ? <>Ksh {calculatedFare.toLocaleString()}</> : <Skeleton className="h-6 w-20 inline-block"/>}
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
                                <Button onClick={() => handleBookingSubmit(calculatedFare, calculatedLuggageFee)} className="w-full" disabled={calculatedFare <= 0}>
                                    Complete Payment
                                </Button>
                            </div>
                        </TabsContent>
                        <TabsContent value="mpesa">
                            <div className="space-y-4 rounded-md border bg-card p-4">
                                <Label htmlFor="mpesa-phone">M-Pesa Phone Number</Label>
                                <Input id="mpesa-phone" placeholder="e.g. 0712345678" value={mpesaPhoneNumber} onChange={(e) => setMpesaPhoneNumber(e.target.value)} />
                                <Button onClick={() => handleBookingSubmit(calculatedFare, calculatedLuggageFee)} className="w-full" disabled={calculatedFare <= 0 || !mpesaPhoneNumber}>
                                    Complete Payment
                                </Button>
                            </div>
                        </TabsContent>
                        <TabsContent value="paypal">
                            <div className="space-y-4 rounded-md border bg-card p-4 text-center">
                               <p className="text-sm text-muted-foreground">You will be redirected to PayPal to complete your purchase securely.</p>
                               <Button onClick={() => handleBookingSubmit(calculatedFare, calculatedLuggageFee)} className="w-full" disabled={calculatedFare <= 0}>
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
                            <Image src="/boatlogo.jpg" alt="BlueRide Logo" width={32} height={32} className="h-8 w-8 rounded-md" />
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
                            {receiptData?.bookingType !== 'charter' && (
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <p><strong className="font-medium text-muted-foreground">From:</strong></p>
                                    <p className="text-right font-semibold">{receiptData?.pickup}</p>
                                    <p><strong className="font-medium text-muted-foreground">To:</strong></p>
                                    <p className="text-right font-semibold">{receiptData?.destination}</p>
                                </div>
                            )}
                             <Separator/>
                             <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                <p><strong className="font-medium text-muted-foreground">Booking Type:</strong></p>
                                <p className="text-right">{
                                    receiptData?.bookingType === 'seat' ? <>Seat(s): {receiptData.seats}</> 
                                    : receiptData?.bookingType === 'whole_boat' ? 'Whole Boat'
                                    : <>Charter ({receiptData?.destination})</>
                                }</p>
                                
                                <p><strong className="font-medium text-muted-foreground">Status:</strong></p>
                                <p className="text-right capitalize font-bold">{receiptData?.status}</p>
                            </div>

                             {receiptData && receiptData.luggageFee && receiptData.luggageFee > 0 && (
                                <>
                                <Separator/>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <p><strong className="font-medium text-muted-foreground">Trip Fare:</strong></p>
                                    <p className="text-right">Ksh {(receiptData.finalFare! - receiptData.luggageFee).toLocaleString()}</p>
                                    <p><strong className="font-medium text-muted-foreground">Luggage Fee:</strong></p>
                                    <p className="text-right">Ksh {receiptData.luggageFee.toLocaleString()}</p>
                                </div>
                                </>
                             )}

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

        {/* Review Dialog */}
        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Leave a Review for Your Trip</DialogTitle>
                    <DialogDescription>
                        How was your trip on {reviewBooking?.boat?.name} from {reviewBooking?.pickup} to {reviewBooking?.destination}?
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div>
                        <Label>Your Rating</Label>
                        <div className="flex items-center gap-2 mt-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={`h-8 w-8 cursor-pointer transition-colors ${
                                        (hoverRating || rating) >= star
                                            ? 'text-yellow-400 fill-yellow-400'
                                            : 'text-gray-300'
                                    }`}
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                />
                            ))}
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="comment">Your Comments (Optional)</Label>
                        <Textarea
                            id="comment"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Tell us more about your experience..."
                            className="mt-2"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsReviewDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleReviewSubmit} disabled={rating === 0}>Submit Review</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        {/* Refund Dialog */}
        <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Request a Refund</DialogTitle>
                     <DialogDescription>
                        Please review our refund policy before submitting a request.
                    </DialogDescription>
                </DialogHeader>
                 <div className="py-4 space-y-4 text-sm">
                    <div className="p-4 bg-secondary rounded-md space-y-2">
                        <h4 className="font-semibold">Refund Policy</h4>
                        <ul className="list-disc list-inside text-muted-foreground">
                            <li>A <strong className="text-foreground">full refund</strong> is issued if the trip is cancelled by the captain or platform.</li>
                            <li>Cancellations by the rider on confirmed trips are subject to a <strong className="text-foreground">30% penalty fee</strong>.</li>
                            <li><strong className="text-foreground">No refunds</strong> are issued for trips that have already been completed.</li>
                            <li>Exceptional cases will be reviewed on a case-by-case basis.</li>
                        </ul>
                    </div>
                    <div>
                        <Label htmlFor="refund-reason">Reason for Request</Label>
                        <Textarea
                            id="refund-reason"
                            value={refundReason}
                            onChange={(e) => setRefundReason(e.target.value)}
                            placeholder="Please provide a detailed reason for your refund request..."
                            className="mt-2"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsRefundDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleRefundSubmit} disabled={!refundReason}>Submit Request</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
