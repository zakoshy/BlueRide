
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, PlusCircle, Ship, BookOpen, AlertCircle, User, Sailboat, Minus, Plus, CheckSquare, Send, ChevronsRight, DollarSign, TrendingUp, Settings2 } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";


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
}

interface Captain {
    uid: string;
    name: string;
    email: string;
}

interface Route {
    _id: string;
    from: string;
    to: string;
    fare_per_person_kes: number;
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
  const [routes, setRoutes] = useState<Route[]>([]);
  const [fareChanges, setFareChanges] = useState<Record<string, number | string>>({});
  
  const [isAddBoatDialogOpen, setAddBoatDialogOpen] = useState(false);
  const [newBoatName, setNewBoatName] = useState('');
  const [newBoatCapacity, setNewBoatCapacity] = useState('');
  const [newBoatDescription, setNewBoatDescription] = useState('');
  const [newBoatLicense, setNewBoatLicense] = useState('');
  const [newBoatType, setNewBoatType] = useState<'standard' | 'luxury' | 'speed'>('standard');
  
  const [isAdjustFareDialogOpen, setAdjustFareDialogOpen] = useState(false);
  const [fareAdjustmentPercent, setFareAdjustmentPercent] = useState([0]);

  // State for single route adjustment dialog
  const [isSingleAdjustDialogOpen, setSingleAdjustDialogOpen] = useState(false);
  const [routeToAdjust, setRouteToAdjust] = useState<Route | null>(null);
  const [singleFareAdjustmentPercent, setSingleFareAdjustmentPercent] = useState([0]);



  const fetchOwnerData = useCallback(async (currentUser: FirebaseUser) => {
    if (!currentUser) return;
    setLoading(true);
    // Fetch boats, bookings, captains, and routes in parallel
    try {
        const [boatsRes, bookingsRes, captainsRes, routesRes] = await Promise.all([
            fetch(`/api/boats?ownerId=${currentUser.uid}`),
            fetch(`/api/bookings/owner/${currentUser.uid}`),
            fetch('/api/captains'),
            fetch('/api/routes/fares')
        ]);

        if (boatsRes.ok) setBoats(await boatsRes.json());
        else toast({ title: "Error", description: "Failed to fetch your boats.", variant: "destructive" });

        if (bookingsRes.ok) setBookings(await bookingsRes.json());
        else toast({ title: "Error", description: "Failed to fetch your bookings.", variant: "destructive" });

        if (captainsRes.ok) setCaptains(await captainsRes.json());
        else toast({ title: "Error", description: "Could not fetch list of captains.", variant: "destructive" });

        if (routesRes.ok) setRoutes(await routesRes.json());
        else toast({ title: "Error", description: "Could not fetch route fares.", variant: "destructive" });
        
    } catch (error) {
        console.error("Failed to fetch owner data", error);
        toast({ title: "Error", description: "An unexpected error occurred while fetching your data.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }, [toast]);

 useEffect(() => {
    // This effect handles authentication checks and data fetching.
    // It waits until the initial auth state loading is complete.
    if (authLoading) {
        return; // Wait for Firebase to initialize
    }

    // If auth is done and there's no user, redirect to login.
    if (!user) {
        router.push('/login');
        return;
    }

    // If we have a user but are waiting for the profile from our DB, do nothing yet.
    // The component will show a loading skeleton.
    if (!profile) {
        return;
    }

    // Once we have a user and their profile, check their role.
    if (profile.role === 'boat_owner' || profile.role === 'admin') {
        setIsOwner(true);
        fetchOwnerData(user);
    } else {
        // If the user is not an owner or admin, they shouldn't be here.
        router.push('/profile');
    }
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
  
   const handleFareInputChange = (routeId: string, value: string) => {
        setFareChanges(prev => ({ ...prev, [routeId]: value }));
    };

    const submitFareProposals = async (proposals: { routeId: string; proposedFare: number }[]) => {
        if (!user || proposals.length === 0) return;

        try {
            const response = await fetch('/api/fare-proposals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ownerId: user.uid, proposals }),
            });

            if (response.ok) {
                toast({
                    title: "Proposals Submitted",
                    description: "Your fare change proposals have been sent to an admin for review.",
                });
                // Clear the submitted changes from the local state
                const submittedIds = proposals.map(p => p.routeId);
                setFareChanges(prev => {
                    const next = { ...prev };
                    submittedIds.forEach(id => delete next[id]);
                    return next;
                });
            } else {
                const errorData = await response.json();
                toast({ title: "Submission Failed", description: errorData.message || "Could not submit fare proposals.", variant: "destructive" });
            }
        } catch (error) {
            console.error("Error submitting fare proposals:", error);
            toast({ title: "Error", description: "An unexpected error occurred while submitting proposals.", variant: "destructive" });
        }
    };

    const handleSubmitSingleProposal = (route: Route) => {
        const proposedFare = Number(fareChanges[route._id]);
        if (isNaN(proposedFare) || proposedFare <= 0 || proposedFare === route.fare_per_person_kes) {
            toast({ title: "Invalid Fare", description: "Please enter a valid, new fare.", variant: "destructive" });
            return;
        }
        submitFareProposals([{ routeId: route._id, proposedFare }]);
    };

    const handleUpdateAllFares = () => {
        const proposals = Object.entries(fareChanges)
            .map(([routeId, fare]) => {
                const route = routes.find(r => r._id === routeId);
                const proposedFare = Number(fare);
                if (route && !isNaN(proposedFare) && proposedFare > 0 && proposedFare !== route.fare_per_person_kes) {
                    return { routeId, proposedFare };
                }
                return null;
            })
            .filter((p): p is { routeId: string; proposedFare: number } => p !== null);

        if (proposals.length > 0) {
            submitFareProposals(proposals);
        } else {
            toast({ title: "No Changes", description: "No new, valid fare changes to submit." });
        }
    };
    
     const handleApplyPercentageChange = () => {
        const percent = fareAdjustmentPercent[0];
        const multiplier = 1 + (percent / 100);
        const newFareChanges: Record<string, number> = {};
        
        routes.forEach(route => {
            const currentFare = route.fare_per_person_kes;
            const newFare = Math.round(currentFare * multiplier);
            // Only stage the change if it's different from the current fare
            if (newFare !== currentFare) {
                 newFareChanges[route._id] = newFare;
            }
        });

        setFareChanges(newFareChanges);
        toast({
            title: "Fares Adjusted",
            description: `All fares have been adjusted by ${percent}%. Review and click 'Submit All Changes' to propose them.`
        });
        setAdjustFareDialogOpen(false);
    }
    
    const handleSingleAdjustClick = (route: Route) => {
        setRouteToAdjust(route);
        setSingleFareAdjustmentPercent([0]);
        setSingleAdjustDialogOpen(true);
    };

    const handleApplySinglePercentageChange = () => {
        if (!routeToAdjust) return;

        const percent = singleFareAdjustmentPercent[0];
        const multiplier = 1 + (percent / 100);
        const newFare = Math.round(routeToAdjust.fare_per_person_kes * multiplier);
        
        // Update the input field for this specific route
        handleFareInputChange(routeToAdjust._id, newFare.toString());
        
        toast({
            title: "Fare Updated",
            description: `New fare for ${routeToAdjust.from} to ${routeToAdjust.to} is staged at Ksh ${newFare.toLocaleString()}.`,
        });
        
        setSingleAdjustDialogOpen(false);
        setRouteToAdjust(null);
    };



  if (authLoading || loading) {
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
        <p className="text-muted-foreground mb-8">Manage your boats, bookings, and route pricing below.</p>
        
        <Tabs defaultValue="fares">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="fares">Route Fares</TabsTrigger>
                <TabsTrigger value="bookings">Booking History</TabsTrigger>
                <TabsTrigger value="boats">My Fleet</TabsTrigger>
            </TabsList>

            <TabsContent value="fares" className="mt-6 space-y-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                         <div>
                            <CardTitle className="flex items-center gap-2"><DollarSign/>Route Fare Management</CardTitle>
                            <CardDescription>Propose fare changes for routes. All changes require admin approval.</CardDescription>
                         </div>
                          <div className="flex items-center gap-2">
                            <Dialog open={isAdjustFareDialogOpen} onOpenChange={setAdjustFareDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline"><TrendingUp className="mr-2 h-4 w-4"/>Adjust All Fares</Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                    <DialogTitle>Adjust All Route Fares</DialogTitle>
                                    <DialogDescription>
                                        Use the slider to apply a percentage-based adjustment to all your routes.
                                    </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4 space-y-4">
                                        <div className="text-center">
                                            <span className="text-4xl font-bold">
                                                {fareAdjustmentPercent[0] > 0 && '+'}
                                                {fareAdjustmentPercent[0]}%
                                            </span>
                                        </div>
                                        <Slider
                                            defaultValue={[0]}
                                            value={fareAdjustmentPercent}
                                            onValueChange={setFareAdjustmentPercent}
                                            max={15}
                                            min={-15}
                                            step={1}
                                        />
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>-15%</span>
                                            <span>0%</span>
                                            <span>+15%</span>
                                        </div>
                                    </div>
                                    <CardFooter>
                                        <Button className="w-full" onClick={handleApplyPercentageChange}>Apply Adjustment</Button>
                                    </CardFooter>
                                </DialogContent>
                            </Dialog>
                             <Button onClick={handleUpdateAllFares} disabled={Object.keys(fareChanges).length === 0}>
                                <Send className="mr-2 h-4 w-4"/> Submit All Changes
                             </Button>
                         </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>From</TableHead>
                                    <TableHead>To</TableHead>
                                    <TableHead>Current Fare (Ksh)</TableHead>
                                    <TableHead>New Fare (Ksh)</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {routes.map(route => (
                                    <TableRow key={route._id}>
                                        <TableCell className="font-medium">{route.from}</TableCell>
                                        <TableCell className="font-medium">{route.to}</TableCell>
                                        <TableCell>{route.fare_per_person_kes.toLocaleString()}</TableCell>
                                        <TableCell>
                                            <Input 
                                                type="number" 
                                                className="max-w-[150px]"
                                                placeholder={route.fare_per_person_kes.toString()}
                                                value={fareChanges[route._id] ?? ''}
                                                onChange={(e) => handleFareInputChange(route._id, e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => handleSingleAdjustClick(route)}
                                            >
                                               <Settings2 className="mr-2 h-4 w-4"/> Adjust
                                            </Button>
                                             <Button 
                                                variant="default" 
                                                size="sm"
                                                onClick={() => handleSubmitSingleProposal(route)}
                                                disabled={!fareChanges[route._id] || Number(fareChanges[route._id]) === route.fare_per_person_kes}
                                            >
                                               <Send className="mr-2 h-4 w-4"/> Propose
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         {routes.length === 0 && !loading && (
                            <p className="text-center text-muted-foreground py-8">No routes found to manage.</p>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="bookings" className="mt-6 space-y-8">
                 <Card>
                    <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BookOpen/>Booking History</CardTitle>
                    <CardDescription>
                       This is a log of all your past bookings.
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
                                        <TableHead>Final Fare</TableHead>
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
                                            <TableCell className="font-semibold">Ksh {booking.finalFare?.toLocaleString() || booking.baseFare.toLocaleString()}</TableCell>
                                            <TableCell>{new Date(booking.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell><Badge variant={statusVariant(booking.status)}>{booking.status}</Badge></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                           </Table>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">You have no booking history yet.</p>
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

        {/* Single Route Fare Adjustment Dialog */}
        <Dialog open={isSingleAdjustDialogOpen} onOpenChange={setSingleAdjustDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Adjust Fare for Route</DialogTitle>
                    <DialogDescription>
                        <p className="font-semibold">{routeToAdjust?.from} to {routeToAdjust?.to}</p>
                        <p>Current Fare: Ksh {routeToAdjust?.fare_per_person_kes.toLocaleString()}</p>
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="text-center">
                        <span className="text-4xl font-bold">
                            {singleFareAdjustmentPercent[0] > 0 && '+'}
                            {singleFareAdjustmentPercent[0]}%
                        </span>
                    </div>
                    <Slider
                        defaultValue={[0]}
                        value={singleFareAdjustmentPercent}
                        onValueChange={setSingleFareAdjustmentPercent}
                        max={15}
                        min={-15}
                        step={1}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>-15%</span>
                        <span>0%</span>
                        <span>+15%</span>
                    </div>
                </div>
                <CardFooter>
                    <Button className="w-full" onClick={handleApplySinglePercentageChange}>Update Staged Fare</Button>
                </CardFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}

    

    
