
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, PlusCircle, Ship, BookOpen, AlertCircle, User, Sailboat, Minus, Plus, CheckSquare } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/header";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Combobox } from "@/components/ui/combobox";
import type { User as FirebaseUser } from "firebase/auth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


interface Boat {
    _id: string;
    name: string;
    capacity: number;
    description: string;
    licenseNumber: string;
    isValidated: boolean;
    ownerId: string;
    captainId?: string;
    type: 'standard' | 'luxury' | 'speed';
}

interface Booking {
    _id: string;
    boatId: string;
    riderId: string;
    pickup: string;
    destination: string;
    bookingType: 'seat' | 'whole_boat';
    seats?: number;
    status: 'pending' | 'accepted' | 'rejected' | 'confirmed' | 'completed';
    createdAt: string;
    rider?: { name: string };
    boat?: { name: string };
    baseFare: number;
    finalFare?: number;
    adjustmentPercent?: number;
}

interface Captain {
    uid: string;
    name: string;
    email: string;
}

const MAX_ADJUSTMENT = 15; // 15%

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  const [boats, setBoats] = useState<Boat[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [captains, setCaptains] = useState<Captain[]>([]);
  
  const [currentAdjustments, setCurrentAdjustments] = useState<Record<string, number>>({});

  const [isAddBoatDialogOpen, setAddBoatDialogOpen] = useState(false);
  const [newBoatName, setNewBoatName] = useState('');
  const [newBoatCapacity, setNewBoatCapacity] = useState('');
  const [newBoatDescription, setNewBoatDescription] = useState('');
  const [newBoatLicense, setNewBoatLicense] = useState('');
  const [newBoatType, setNewBoatType] = useState<'standard' | 'luxury' | 'speed'>('standard');


  const fetchOwnerData = useCallback(async (currentUser: FirebaseUser) => {
    if (!currentUser) return;
    
    // Fetch boats
    try {
        const boatsResponse = await fetch(`/api/boats?ownerId=${currentUser.uid}`);
        if (boatsResponse.ok) {
            const boatsData = await boatsResponse.json();
            setBoats(boatsData);
        } else {
            toast({ title: "Error", description: "Failed to fetch your boats.", variant: "destructive" });
        }
    } catch (error) {
        console.error("Failed to fetch boats", error);
        toast({ title: "Error", description: "An unexpected error occurred while fetching your boats.", variant: "destructive" });
    }

    // Fetch bookings
     try {
        const bookingsResponse = await fetch(`/api/bookings/owner/${currentUser.uid}`);
        if (bookingsResponse.ok) {
            const bookingsData = await bookingsResponse.json();
            setBookings(bookingsData);
            // Initialize adjustments state
            const initialAdjustments: Record<string, number> = {};
            bookingsData.forEach((b: Booking) => {
                initialAdjustments[b._id] = b.adjustmentPercent || 0;
            });
            setCurrentAdjustments(initialAdjustments);
        } else {
            toast({ title: "Error", description: "Failed to fetch your bookings.", variant: "destructive" });
        }
    } catch (error) {
        console.error("Failed to fetch bookings", error);
        toast({ title: "Error", description: "An unexpected error occurred while fetching your bookings.", variant: "destructive" });
    }

    // Fetch captains
    try {
        const captainsResponse = await fetch('/api/captains');
        if(captainsResponse.ok) {
            const captainsData = await captainsResponse.json();
            setCaptains(captainsData);
        } else {
            toast({ title: "Error", description: "Could not fetch list of captains.", variant: "destructive" });
        }
    } catch(error) {
         console.error("Failed to fetch captains", error);
         toast({ title: "Error", description: "An unexpected error occurred while fetching captains.", variant: "destructive" });
    }

  }, [toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (profile?.role === 'boat_owner' || profile?.role === 'admin') {
      setIsOwner(true);
      fetchOwnerData(user);
    } else {
      router.push('/profile');
    }
    setLoading(false);
  }, [user, profile, authLoading, router, fetchOwnerData]);


  const handleAddBoat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
        const response = await fetch('/api/boats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: newBoatName,
                capacity: parseInt(newBoatCapacity, 10),
                description: newBoatDescription,
                licenseNumber: newBoatLicense,
                ownerId: user.uid,
                type: newBoatType,
            }),
        });

        if (response.ok) {
            toast({ title: "Success", description: "New boat added successfully. It is pending validation from an admin." });
            setNewBoatName('');
            setNewBoatCapacity('');
            setNewBoatDescription('');
            setNewBoatLicense('');
            setAddBoatDialogOpen(false);
            fetchOwnerData(user); // Refresh the list
        } else {
            const errorData = await response.json();
            toast({ title: "Add Failed", description: errorData.message || "Could not add boat.", variant: "destructive" });
        }
    } catch (error) {
        console.error("Failed to add boat", error);
        toast({ title: "Error", description: "An unexpected error occurred while adding the boat.", variant: "destructive" });
    }
  }

  const handleAssignCaptain = async (boatId: string, captainId: string) => {
     try {
        const response = await fetch(`/api/boats/captain`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ boatId, captainId }),
        });

        if (response.ok) {
            toast({ title: "Success", description: `Captain assigned successfully.` });
            if (user) fetchOwnerData(user); // Refresh boats
        } else {
            const errorData = await response.json();
            toast({ title: "Update Failed", description: errorData.message || "Could not assign captain.", variant: "destructive" });
        }
    } catch (error) {
        console.error("Failed to assign captain", error);
        toast({ title: "Error", description: "An unexpected error occurred while assigning captain.", variant: "destructive" });
    }
  }
  
  const handleFareAdjustment = async (bookingId: string, baseFare: number) => {
    const adjustmentPercent = currentAdjustments[bookingId] || 0;
    const finalFare = baseFare * (1 + adjustmentPercent / 100);

    try {
         const response = await fetch('/api/bookings/adjust', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId, finalFare, adjustmentPercent }),
        });

        if(response.ok) {
             toast({ title: "Success", description: `Fare has been adjusted successfully.` });
             if (user) fetchOwnerData(user); // Refresh to show new final fare
        } else {
             const errorData = await response.json();
             toast({ title: "Adjustment Failed", description: errorData.message || "Could not adjust fare.", variant: "destructive" });
        }
    } catch (error) {
        console.error("Failed to adjust fare", error);
        toast({ title: "Error", description: "An unexpected error occurred while adjusting the fare.", variant: "destructive" });
    }
  }


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

  const captainOptions = captains.map(c => ({ value: c.uid, label: `${c.name} (${c.email})`}));
  const statusVariant = (status: Booking['status']) => {
    switch (status) {
        case 'confirmed': return 'default';
        case 'completed': return 'secondary';
        case 'rejected': return 'destructive';
        default: return 'outline';
    }
  };
  
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const pastBookings = bookings.filter(b => b.status === 'rejected');
  const getFinalFare = (baseFare: number, adjustment: number) => baseFare * (1 + adjustment/100);

  return (
    <div className="min-h-dvh w-full bg-secondary/50">
       <Header />

      <main className="container mx-auto p-4 sm:p-6 md:p-8">
        <h1 className="text-3xl font-bold mb-2">Welcome, {user?.displayName || 'Owner'}!</h1>
        <p className="text-muted-foreground mb-8">Manage your boats and bookings. All bookings are auto-completed upon payment.</p>
        
        <Tabs defaultValue="bookings">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="bookings">Bookings</TabsTrigger>
                <TabsTrigger value="boats">My Fleet</TabsTrigger>
            </TabsList>

            <TabsContent value="bookings" className="mt-6 space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BookOpen/>Completed Trips & Fare Adjustment</CardTitle>
                        <CardDescription>These trips are completed. You can adjust the final fare for a short period after booking.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {completedBookings.length > 0 ? (
                           <div className="space-y-4">
                                {completedBookings.map(booking => (
                                    <Card key={booking._id} className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                        <div className="col-span-1">
                                             <div className="font-semibold">{booking.boat?.name || 'N/A'}</div>
                                             <p className="text-sm text-muted-foreground">Rider: {booking.rider?.name || 'N/A'}</p>
                                             <p className="text-xs">{booking.pickup} to {booking.destination}</p>
                                             <p className="text-xs text-muted-foreground">{booking.bookingType === 'seat' ? `${booking.seats} seat(s)` : 'Whole boat'}</p>
                                        </div>
                                         <div className="col-span-1 space-y-2">
                                            <Label>Fare Adjustment ({currentAdjustments[booking._id] || 0}%)</Label>
                                            <div className="flex items-center gap-2">
                                                <Minus className="h-4 w-4 text-muted-foreground"/>
                                                <Slider
                                                    min={-MAX_ADJUSTMENT}
                                                    max={MAX_ADJUSTMENT}
                                                    step={1}
                                                    value={[currentAdjustments[booking._id] || 0]}
                                                    onValueChange={(value) => setCurrentAdjustments(prev => ({ ...prev, [booking._id]: value[0] }))}
                                                />
                                                <Plus className="h-4 w-4 text-muted-foreground"/>
                                            </div>
                                            <div className="text-center">
                                                 {typeof booking.baseFare === 'number' && (
                                                    <>
                                                        <p className="text-xs text-muted-foreground">Base: Ksh {booking.baseFare.toLocaleString()}</p>
                                                        <p className="font-semibold">Final: Ksh {getFinalFare(booking.baseFare, currentAdjustments[booking._id] || 0).toLocaleString()}</p>
                                                    </>
                                                 )}
                                            </div>
                                        </div>
                                        <div className="col-span-1 flex flex-col items-end gap-2">
                                            <Button size="sm" className="w-full sm:w-auto" onClick={() => handleFareAdjustment(booking._id, booking.baseFare)}>Update Fare</Button>
                                        </div>
                                    </Card>
                                ))}
                           </div>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">You have no completed trips yet.</p>
                        )}
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BookOpen/>Booking History</CardTitle>
                    <CardDescription>
                       This is a log of all your past bookings, including rejected ones.
                    </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {pastBookings.length > 0 ? (
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Rider</TableHead>
                                        <TableHead>Boat</TableHead>
                                        <TableHead>Route</TableHead>
                                        <TableHead>Final Fare</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pastBookings.map(booking => (
                                        <TableRow key={booking._id}>
                                            <TableCell>{booking.rider?.name || 'N/A'}</TableCell>
                                            <TableCell>{booking.boat?.name || 'N/A'}</TableCell>
                                            <TableCell className="text-xs">{booking.pickup}<br/>to {booking.destination}</TableCell>
                                            <TableCell className="font-semibold">Ksh {booking.finalFare?.toLocaleString() || 'N/A'}</TableCell>
                                            <TableCell>{new Date(booking.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell><Badge variant={statusVariant(booking.status)}>{booking.status}</Badge></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                           </Table>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">You have no other booking history yet.</p>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="boats" className="mt-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                           <CardTitle className="flex items-center gap-2"><Ship/>Your Fleet</CardTitle>
                           <CardDescription>A list of your currently registered boats. Assign captains here.</CardDescription>
                        </div>
                        <Dialog open={isAddBoatDialogOpen} onOpenChange={setAddBoatDialogOpen}>
                            <DialogTrigger asChild>
                                 <Button><PlusCircle/>Add New Boat</Button>
                            </DialogTrigger>
                             <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                <DialogTitle>Add New Boat</DialogTitle>
                                <DialogDescription>
                                    Fill in the details for the new boat. It will be added as 'Pending Validation'.
                                </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleAddBoat}>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="boat-name" className="text-right">Name</Label>
                                        <Input id="boat-name" value={newBoatName} onChange={(e) => setNewBoatName(e.target.value)} className="col-span-3" required/>
                                    </div>
                                     <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="license" className="text-right">License #</Label>
                                        <Input id="license" value={newBoatLicense} onChange={(e) => setNewBoatLicense(e.target.value)} className="col-span-3" required/>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="capacity" className="text-right">Capacity</Label>
                                        <Input id="capacity" type="number" value={newBoatCapacity} onChange={(e) => setNewBoatCapacity(e.target.value)} className="col-span-3" required/>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="boat-type" className="text-right">Type</Label>
                                         <Select onValueChange={(value) => setNewBoatType(value as any)} defaultValue={newBoatType}>
                                            <SelectTrigger className="col-span-3">
                                                <SelectValue placeholder="Select boat type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="standard">Standard</SelectItem>
                                                <SelectItem value="luxury">Luxury</SelectItem>
                                                <SelectItem value="speed">Speed Boat</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="description" className="text-right">Description</Label>
                                        <Textarea id="description" value={newBoatDescription} onChange={(e) => setNewBoatDescription(e.target.value)} className="col-span-3" required/>
                                    </div>
                                </div>
                                <CardFooter>
                                    <Button type="submit" className="w-full">Save Boat</Button>
                                </CardFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         {boats.length > 0 ? boats.map(boat => (
                            <Card key={boat._id} className="p-4 flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div className="flex-grow">
                                    <div className="font-semibold flex items-center gap-2">{boat.name} <Badge variant={boat.isValidated ? 'default' : 'secondary'}>{boat.isValidated ? 'Validated' : 'Pending'}</Badge> <Badge variant="outline" className="capitalize">{boat.type}</Badge></div>
                                    <p className="text-sm text-muted-foreground">Capacity: {boat.capacity} riders | License: {boat.licenseNumber}</p>
                                    <div className="mt-2 text-sm">
                                        <span className="font-medium">Captain:</span> {
                                            captains.find(c => c.uid === boat.captainId)?.name || <span className="text-muted-foreground italic">Not Assigned</span>
                                        }
                                    </div>
                                </div>
                                <div className="w-full sm:w-64">
                                  <Label className="text-xs text-muted-foreground">Assign Captain</Label>
                                  <Combobox
                                    options={captainOptions}
                                    selectedValue={boat.captainId || ''}
                                    onSelect={(captainId) => handleAssignCaptain(boat._id, captainId)}
                                    placeholder="Select a captain..."
                                    searchPlaceholder="Search captains..."
                                    notFoundText="No captains found."
                                  />
                                </div>
                            </Card>
                        )) : (
                           <p className="text-center text-muted-foreground py-4">You have not added any boats yet.</p>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
