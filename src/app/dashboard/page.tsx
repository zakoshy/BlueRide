
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, PlusCircle, Ship, BookOpen, AlertCircle, Sailboat, CheckSquare, Send, DollarSign, TrendingUp, Settings2, BarChart3, Banknote, UserCheck, Route as RouteIcon, Trash2 } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/header";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Combobox } from "@/components/ui/combobox";
import type { User as FirebaseUser } from "firebase/auth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getCoastalBusinessAdvice, type CoastalAdviceOutput } from "@/ai/flows/coastal-events-flow";


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

// ERP-specific types
interface FinancialSummary {
    totalRevenue: number;
    totalOwnerShare: number;
    totalCaptainCommission: number;
    tripCount: number;
}

interface CrewPayout {
    captainId: string;
    name: string;
    email: string;
    totalCommission: number;
    tripCount: number;
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
  const [newBoatRoutes, setNewBoatRoutes] = useState<string[]>([]);
  
  const [isAdjustFareDialogOpen, setAdjustFareDialogOpen] = useState(false);
  const [fareAdjustmentPercent, setFareAdjustmentPercent] = useState([0]);

  // State for single route adjustment dialog
  const [isSingleAdjustDialogOpen, setSingleAdjustDialogOpen] = useState(false);
  const [routeToAdjust, setRouteToAdjust] = useState<Route | null>(null);
  const [singleFareAdjustmentPercent, setSingleFareAdjustmentPercent] = useState([0]);
  
  // State for managing boat routes
  const [isManageRoutesOpen, setManageRoutesOpen] = useState(false);
  const [boatToManageRoutes, setBoatToManageRoutes] = useState<Boat | null>(null);
  const [assignedRoutes, setAssignedRoutes] = useState<string[]>([]);
  
  // ERP State
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [crewPayouts, setCrewPayouts] = useState<CrewPayout[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  
  // AI Advisor State
  const [advice, setAdvice] = useState<CoastalAdviceOutput | null>(null);
  const [isAdviceLoading, setIsAdviceLoading] = useState(true);
  
  // State for route search in dialogs
  const [routeSearch, setRouteSearch] = useState("");


  const fetchOwnerData = useCallback(async (currentUser: FirebaseUser) => {
    if (!currentUser) return;
    setLoading(true);
    setIsAdviceLoading(true);
    try {
        const [boatsRes, bookingsRes, captainsRes, routesRes, finSummaryRes, crewPayoutsRes, adviceRes] = await Promise.all([
            fetch(`/api/boats?ownerId=${currentUser.uid}`),
            fetch(`/api/bookings/owner/${currentUser.uid}`),
            fetch('/api/captains'),
            fetch('/api/routes/fares'),
            fetch(`/api/erp/owner/${currentUser.uid}/financial-summary`),
            fetch(`/api/erp/owner/${currentUser.uid}/crew-payouts`),
            getCoastalBusinessAdvice()
        ]);

        if (boatsRes.ok) setBoats(await boatsRes.json());
        else toast({ title: "Error", description: "Failed to fetch your boats.", variant: "destructive" });

        if (bookingsRes.ok) setBookings(await bookingsRes.json());
        else toast({ title: "Error", description: "Failed to fetch your bookings.", variant: "destructive" });

        if (captainsRes.ok) setCaptains(await captainsRes.json());
        else toast({ title: "Error", description: "Could not fetch list of captains.", variant: "destructive" });

        if (routesRes.ok) setRoutes(await routesRes.json());
        else toast({ title: "Error", description: "Could not fetch route fares.", variant: "destructive" });

        if (finSummaryRes.ok) setFinancialSummary(await finSummaryRes.json());
        else toast({ title: "Error", description: "Could not fetch financial summary.", variant: "destructive" });
        
        if (crewPayoutsRes.ok) setCrewPayouts(await crewPayoutsRes.json());
        else toast({ title: "Error", description: "Could not fetch crew payouts.", variant: "destructive" });

        setAdvice(adviceRes);

    } catch (error) {
        console.error("Failed to fetch owner data", error);
        toast({ title: "Error", description: "An unexpected error occurred while fetching your data.", variant: "destructive" });
    } finally {
        setLoading(false);
        setIsAdviceLoading(false);
    }
  }, [toast]);

 useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!user || !profile) {
      if (!authLoading) {
        router.push('/login');
      }
      return;
    }

    if (profile.role === 'boat_owner' || profile.role === 'admin') {
      setIsOwner(true);
      fetchOwnerData(user);
    } else {
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
                capacity: newBoatCapacity,
                description: newBoatDescription,
                licenseNumber: newBoatLicense,
                ownerId: user.uid,
                type: newBoatType,
                routeIds: newBoatRoutes,
            }),
        });

        if (response.ok) {
            toast({ title: "Success", description: "New boat added successfully. It is pending validation from an admin." });
            setNewBoatName('');
            setNewBoatCapacity('');
            setNewBoatDescription('');
            setNewBoatLicense('');
            setNewBoatRoutes([]);
            setRouteSearch('');
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
        
        handleFareInputChange(routeToAdjust._id, newFare.toString());
        
        toast({
            title: "Fare Updated",
            description: `New fare for ${routeToAdjust.from} to ${routeToAdjust.to} is staged at Ksh ${newFare.toLocaleString()}.`,
        });
        
        setSingleAdjustDialogOpen(false);
        setRouteToAdjust(null);
    };

    const handleOpenManageRoutes = async (boat: Boat) => {
        setBoatToManageRoutes(boat);
        setRouteSearch('');
        setAssignedRoutes([]); // Clear previous state
        try {
            const response = await fetch(`/api/boats/routes?boatId=${boat._id}`);
            if (response.ok) {
                const currentRoutes: Route[] = await response.json();
                setAssignedRoutes(currentRoutes.map(r => r._id));
            } else {
                toast({ title: "Error", description: "Failed to fetch current routes for this boat.", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "An unexpected error occurred while fetching boat routes.", variant: "destructive" });
        }
        setManageRoutesOpen(true);
    };

    const handleRouteAssignmentChange = (routeId: string, isChecked: boolean) => {
        setAssignedRoutes(prev => {
            if (isChecked) {
                return [...prev, routeId];
            } else {
                return prev.filter(id => id !== routeId);
            }
        });
    };
    
    const handleNewBoatRouteAssignmentChange = (routeId: string, isChecked: boolean) => {
        setNewBoatRoutes(prev => {
            if (isChecked) {
                return [...prev, routeId];
            } else {
                return prev.filter(id => id !== routeId);
            }
        });
    };

    const handleSaveRoutesForBoat = async () => {
        if (!boatToManageRoutes) return;
        try {
            const response = await fetch('/api/boats/routes', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ boatId: boatToManageRoutes._id, routeIds: assignedRoutes }),
            });
            if (response.ok) {
                toast({ title: "Success", description: "Boat routes updated successfully." });
                setManageRoutesOpen(false);
                setBoatToManageRoutes(null);
            } else {
                 const errorData = await response.json();
                 toast({ title: "Save Failed", description: errorData.message || "Could not save routes.", variant: "destructive" });
            }
        } catch (error) {
             toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
        }
    };

    const filteredDialogRoutes = useMemo(() => {
        return routes.filter(route => 
            route.from.toLowerCase().includes(routeSearch.toLowerCase()) ||
            route.to.toLowerCase().includes(routeSearch.toLowerCase())
        );
    }, [routes, routeSearch]);


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

  const filteredRoutes = routes.filter(route => 
    route.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
    route.to.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="min-h-dvh w-full bg-secondary/50">
       <Header />

      <main className="container mx-auto p-4 sm:p-6 md:p-8">
        <div className="mb-6 space-y-2">
            <h1 className="text-3xl font-bold">Welcome, {user?.displayName || 'Owner'}!</h1>
            <p className="text-muted-foreground">Manage your boats, bookings, and route pricing below.</p>
        </div>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>AI Business Intelligence</CardTitle>
            <CardDescription>Actionable insights to help you maximize your business potential.</CardDescription>
          </CardHeader>
          <CardContent>
            {isAdviceLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : advice ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">Seasonal Outlook</h3>
                  <p className="text-sm text-muted-foreground">{advice.seasonalOutlook}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Upcoming Opportunities</h3>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground">
                    {advice.upcomingEvents.map((event, index) => (
                      <li key={index}>
                        <strong>{event.event} ({event.date}):</strong> {event.advice}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold">Strategic Recommendation</h3>
                  <p className="text-sm text-muted-foreground">{advice.strategicRecommendation}</p>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">Could not load business advice at this time.</p>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="boats">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="boats">My Fleet</TabsTrigger>
                <TabsTrigger value="fares">Route Fares</TabsTrigger>
                <TabsTrigger value="bookings">Booking History</TabsTrigger>
                <TabsTrigger value="erp">My ERP</TabsTrigger>
            </TabsList>

            <TabsContent value="fares" className="mt-6 space-y-8">
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                         <div className="flex-grow">
                            <CardTitle className="flex items-center gap-2"><DollarSign/>Route Fare Management</CardTitle>
                            <CardDescription>Propose fare changes for routes. All changes require admin approval.</CardDescription>
                         </div>
                          <div className="flex w-full sm:w-auto items-center gap-2">
                            <Dialog open={isAdjustFareDialogOpen} onOpenChange={setAdjustFareDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="w-full sm:w-auto"><TrendingUp className="mr-2 h-4 w-4"/>Adjust All Fares</Button>
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
                                    <DialogFooter>
                                        <Button className="w-full" onClick={handleApplyPercentageChange}>Apply Adjustment</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                             <Button onClick={handleUpdateAllFares} disabled={Object.keys(fareChanges).length === 0} className="w-full sm:w-auto">
                                <Send className="mr-2 h-4 w-4"/> Submit All Changes
                             </Button>
                         </div>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4">
                            <Input 
                                placeholder="Search for a route..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="max-w-sm"
                            />
                        </div>
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
                                {filteredRoutes.map(route => (
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
                         {filteredRoutes.length === 0 && !loading && (
                            <p className="text-center text-muted-foreground py-8">No routes found matching your search.</p>
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
                           <CardDescription>A list of your registered boats. Assign captains and manage routes here.</CardDescription>
                        </div>
                        <Dialog open={isAddBoatDialogOpen} onOpenChange={setAddBoatDialogOpen}>
                            <DialogTrigger asChild>
                                 <Button onClick={() => setRouteSearch('')}><PlusCircle/>Add New Boat</Button>
                            </DialogTrigger>
                             <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                <DialogTitle>Add New Boat</DialogTitle>
                                <DialogDescription>
                                    Fill in the details and assign routes. The boat will be 'Pending Validation'.
                                </DialogDescription>
                                </DialogHeader>
                                <ScrollArea className="max-h-[70vh]">
                                <form onSubmit={handleAddBoat} className="px-4 py-2">
                                <div className="grid gap-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="boat-name">Name</Label>
                                        <Input id="boat-name" value={newBoatName} onChange={(e) => setNewBoatName(e.target.value)} required/>
                                    </div>
                                     <div className="space-y-2">
                                        <Label htmlFor="license">License #</Label>
                                        <Input id="license" value={newBoatLicense} onChange={(e) => setNewBoatLicense(e.target.value)} required/>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="capacity">Capacity</Label>
                                            <Input id="capacity" type="number" value={newBoatCapacity} onChange={(e) => setNewBoatCapacity(e.target.value)} required/>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="boat-type">Type</Label>
                                             <Select onValueChange={(value) => setNewBoatType(value as any)} defaultValue={newBoatType}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select boat type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="standard">Standard</SelectItem>
                                                    <SelectItem value="luxury">Luxury</SelectItem>
                                                    <SelectItem value="speed">Speed Boat</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea id="description" value={newBoatDescription} onChange={(e) => setNewBoatDescription(e.target.value)} required/>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Assign Routes</Label>
                                        <Input 
                                            placeholder="Search routes..."
                                            value={routeSearch}
                                            onChange={(e) => setRouteSearch(e.target.value)}
                                            className="mb-2"
                                        />
                                         <ScrollArea className="h-40 rounded-md border p-2">
                                            <div className="space-y-1">
                                            {filteredDialogRoutes.map(route => (
                                                <div key={route._id} className="flex items-center space-x-2 p-1">
                                                    <Checkbox
                                                        id={`new-boat-route-${route._id}`}
                                                        checked={newBoatRoutes.includes(route._id)}
                                                        onCheckedChange={(checked) => handleNewBoatRouteAssignmentChange(route._id, !!checked)}
                                                    />
                                                    <Label htmlFor={`new-boat-route-${route._id}`} className="flex-1 cursor-pointer text-xs font-normal">
                                                        {route.from} to {route.to}
                                                    </Label>
                                                </div>
                                            ))}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" className="w-full">Save Boat</Button>
                                </DialogFooter>
                                </form>
                                </ScrollArea>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         {boats.length > 0 ? boats.map(boat => (
                            <Card key={boat._id} className="p-4 flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div>
                                    <div className="font-semibold flex items-center gap-2 flex-wrap">
                                        {boat.name} 
                                        <Badge variant={boat.isValidated ? 'default' : 'secondary'}>{boat.isValidated ? 'Validated' : 'Pending'}</Badge> 
                                        <Badge variant="outline" className="capitalize">{boat.type}</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">Capacity: {boat.capacity} riders | License: {boat.licenseNumber}</p>
                                    <div className="mt-2 text-sm">
                                        <span className="font-medium">Captain:</span> {
                                            captains.find(c => c.uid === boat.captainId)?.name || <span className="text-muted-foreground italic">Not Assigned</span>
                                        }
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-stretch">
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
                                    <Button variant="outline" className="w-full sm:w-auto" onClick={() => handleOpenManageRoutes(boat)}>
                                        <RouteIcon className="mr-2 h-4 w-4"/>
                                        Manage Routes
                                    </Button>
                                </div>
                            </Card>
                        )) : (
                           <p className="text-center text-muted-foreground py-4">You have not added any boats yet.</p>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="erp" className="mt-6 space-y-8">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BarChart3 /> Financial Summary</CardTitle>
                        <CardDescription>A summary of your earnings from all your boats. Does not include the platform fee.</CardDescription>
                    </CardHeader>
                     <CardContent>
                        {financialSummary ? (
                             <div className="grid gap-4 md:grid-cols-3">
                                <Card className="p-4">
                                    <CardHeader className="p-2 pt-0">
                                            <CardTitle className="text-sm font-medium flex items-center justify-between">Your Payout <Banknote/></CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-2 pb-0">
                                        <div className="text-2xl font-bold">Ksh {financialSummary.totalOwnerShare.toLocaleString()}</div>
                                        <p className="text-xs text-muted-foreground">From {financialSummary.tripCount} completed trips</p>
                                    </CardContent>
                                </Card>
                                <Card className="p-4">
                                    <CardHeader className="p-2 pt-0">
                                            <CardTitle className="text-sm font-medium flex items-center justify-between">Captain Payouts <UserCheck/></CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-2 pb-0">
                                        <div className="text-2xl font-bold">Ksh {financialSummary.totalCaptainCommission.toLocaleString()}</div>
                                        <p className="text-xs text-muted-foreground">Total paid to your captains</p>
                                    </CardContent>
                                </Card>
                                 <Card className="p-4 bg-blue-50">
                                    <CardHeader className="p-2 pt-0">
                                            <CardTitle className="text-sm font-medium flex items-center justify-between">Total Gross Revenue <DollarSign/></CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-2 pb-0">
                                        <div className="text-2xl font-bold">Ksh {financialSummary.totalRevenue.toLocaleString()}</div>
                                        <p className="text-xs text-muted-foreground">Your share + Captain share</p>
                                    </CardContent>
                                </Card>
                            </div>
                        ) : (
                             <p className="text-center text-muted-foreground py-8">No financial data to display yet.</p>
                        )}
                    </CardContent>
                 </Card>
                  <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><UserCheck /> Captain Payout Report</CardTitle>
                        <CardDescription>Breakdown of commissions earned by each captain on your boats.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {crewPayouts.length > 0 ? (
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Captain</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Trips</TableHead>
                                        <TableHead className="text-right">Commission Earned</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {crewPayouts.map(captain => (
                                        <TableRow key={captain.captainId}>
                                            <TableCell className="font-medium">{captain.name}</TableCell>
                                            <TableCell>{captain.email}</TableCell>
                                            <TableCell>{captain.tripCount}</TableCell>
                                            <TableCell className="text-right font-semibold text-green-600">Ksh {captain.totalCommission.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                           </Table>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">Your assigned captains have not completed any trips yet.</p>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

        </Tabs>
      </main>

        <Dialog open={isSingleAdjustDialogOpen} onOpenChange={setSingleAdjustDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Adjust Fare for Route</DialogTitle>
                    <div className="text-sm text-muted-foreground pt-2">
                        <div>Current Fare: Ksh {routeToAdjust?.fare_per_person_kes.toLocaleString()}</div>
                        <div className="font-semibold">{routeToAdjust?.from} to {routeToAdjust?.to}</div>
                    </div>
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
                <DialogFooter>
                    <Button className="w-full" onClick={handleApplySinglePercentageChange}>Update Staged Fare</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        {/* Manage Routes Dialog */}
        <Dialog open={isManageRoutesOpen} onOpenChange={setManageRoutesOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Manage Routes for {boatToManageRoutes?.name}</DialogTitle>
                    <DialogDescription>
                        Select the routes this boat will service.
                    </DialogDescription>
                </DialogHeader>
                 <div className="py-2">
                    <Input 
                        placeholder="Search routes..."
                        value={routeSearch}
                        onChange={(e) => setRouteSearch(e.target.value)}
                        className="mb-2"
                    />
                    <ScrollArea className="max-h-[50vh] mt-2">
                        <div className="p-1 space-y-2">
                            {filteredDialogRoutes.map(route => (
                                <div key={route._id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50">
                                    <Checkbox
                                        id={`route-${route._id}`}
                                        checked={assignedRoutes.includes(route._id)}
                                        onCheckedChange={(checked) => handleRouteAssignmentChange(route._id, !!checked)}
                                    />
                                    <Label htmlFor={`route-${route._id}`} className="flex-1 cursor-pointer">
                                        <span className="font-semibold">{route.from}</span> to <span className="font-semibold">{route.to}</span>
                                        <span className="text-xs text-muted-foreground ml-2">(Ksh {route.fare_per_person_kes})</span>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter>
                     <Button variant="outline" onClick={() => setManageRoutesOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveRoutesForBoat}>Save Routes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
