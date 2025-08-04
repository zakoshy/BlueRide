
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, PlusCircle, Ship, BookOpen, AlertCircle, User, Sailboat } from "lucide-react";
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


interface UserProfile {
  _id: string;
  uid: string;
  name: string;
  email: string;
  role: 'rider' | 'boat_owner' | 'admin' | 'captain';
  createdAt: string;
}

interface Boat {
    _id: string;
    name: string;
    capacity: number;
    description: string;
    licenseNumber: string;
    isValidated: boolean;
    ownerId: string;
    captainId?: string;
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
}

interface Captain {
    uid: string;
    name: string;
    email: string;
}

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  const [boats, setBoats] = useState<Boat[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [captains, setCaptains] = useState<Captain[]>([]);

  const [isAddBoatDialogOpen, setAddBoatDialogOpen] = useState(false);
  const [newBoatName, setNewBoatName] = useState('');
  const [newBoatCapacity, setNewBoatCapacity] = useState('');
  const [newBoatDescription, setNewBoatDescription] = useState('');
  const [newBoatLicense, setNewBoatLicense] = useState('');

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
                ownerId: user.uid
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


  return (
    <div className="min-h-dvh w-full bg-secondary/50">
       <Header />

      <main className="container mx-auto p-4 sm:p-6 md:p-8">
        <h1 className="text-3xl font-bold mb-2">Welcome, {user?.displayName || 'Owner'}!</h1>
        <p className="text-muted-foreground mb-8">Manage your boats and view incoming bookings all in one place.</p>
        
        <Tabs defaultValue="bookings">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="bookings">All Bookings</TabsTrigger>
                <TabsTrigger value="boats">My Fleet</TabsTrigger>
            </TabsList>

            <TabsContent value="bookings" className="mt-6">
                 <Card>
                    <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BookOpen/>Confirmed Trips</CardTitle>
                    <CardDescription>
                       This is a log of all confirmed bookings for your boats.
                    </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {bookings.length > 0 ? (
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Rider</TableHead>
                                        <TableHead>Boat</TableHead>
                                        <TableHead>Route</TableHead>
                                        <TableHead>Trip Details</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bookings.map(booking => (
                                        <TableRow key={booking._id}>
                                            <TableCell>{booking.rider?.name || 'N/A'}</TableCell>
                                            <TableCell>{booking.boat?.name || 'N/A'}</TableCell>
                                            <TableCell className="text-xs">{booking.pickup}<br/>to {booking.destination}</TableCell>
                                            <TableCell className="text-sm">{booking.bookingType === 'seat' ? `${booking.seats} seat(s)` : 'Whole boat'}</TableCell>
                                            <TableCell>{new Date(booking.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell><Badge variant={statusVariant(booking.status)}>{booking.status}</Badge></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                           </Table>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">You have no bookings yet.</p>
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
                                    <div className="font-semibold">{boat.name} <Badge variant={boat.isValidated ? 'default' : 'secondary'}>{boat.isValidated ? 'Validated' : 'Pending'}</Badge></div>
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
