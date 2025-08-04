
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, DollarSign, BarChart, AlertCircle, Banknote, Ship, UserCheck, BookOpen, UserSquare } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface TripFinancials {
    _id: string;
    bookingId: string;
    tripCompletedAt: string;
    totalFare: number;
    platformFee: number;
    captainCommission: number;
    boatOwnerShare: number;
}

interface FleetBoat {
    _id: string;
    name: string;
    capacity: number;
    licenseNumber: string;
    isValidated: boolean;
    owner: { name: string; email: string };
    captain: { name: string; email: string } | null;
}

interface CrewMember {
    _id: string;
    uid: string;
    name: string;
    email: string;
    tripCount: number;
    totalCommission: number;
}

interface Booking {
    _id: string;
    pickup: string;
    destination: string;
    status: string;
    createdAt: string;
    rider: { name: string };
    boat: { name: string };
}

export default function ErpPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    
    // Financials State
    const [financials, setFinancials] = useState<TripFinancials[]>([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalPlatformFee, setTotalPlatformFee] = useState(0);
    const [totalPayouts, setTotalPayouts] = useState(0);

    // Fleet State
    const [fleet, setFleet] = useState<FleetBoat[]>([]);

    // Crew State
    const [crew, setCrew] = useState<CrewMember[]>([]);

    // Bookings State
    const [bookings, setBookings] = useState<Booking[]>([]);


    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [financialsRes, fleetRes, crewRes, bookingsRes] = await Promise.all([
                fetch('/api/erp/trip-financials'),
                fetch('/api/erp/fleet'),
                fetch('/api/erp/crew'),
                fetch('/api/erp/bookings')
            ]);

            if (financialsRes.ok) {
                const data = await financialsRes.json();
                setFinancials(data);
                const revenue = data.reduce((acc: number, item: TripFinancials) => acc + item.totalFare, 0);
                const platformFee = data.reduce((acc: number, item: TripFinancials) => acc + item.platformFee, 0);
                const payouts = data.reduce((acc: number, item: TripFinancials) => acc + item.boatOwnerShare + item.captainCommission, 0);
                setTotalRevenue(revenue);
                setTotalPlatformFee(platformFee);
                setTotalPayouts(payouts);
            } else {
                 toast({ title: "Error", description: "Failed to fetch financial data.", variant: "destructive" });
            }

            if(fleetRes.ok) {
                const data = await fleetRes.json();
                setFleet(data);
            } else {
                 toast({ title: "Error", description: "Failed to fetch fleet data.", variant: "destructive" });
            }
            
            if(crewRes.ok) {
                const data = await crewRes.json();
                setCrew(data);
            } else {
                toast({ title: "Error", description: "Failed to fetch crew data.", variant: "destructive" });
            }

             if(bookingsRes.ok) {
                const data = await bookingsRes.json();
                setBookings(data);
            } else {
                toast({ title: "Error", description: "Failed to fetch bookings data.", variant: "destructive" });
            }

        } catch (error) {
            console.error("Failed to fetch ERP data", error);
            toast({ title: "Error", description: "An unexpected error occurred while fetching dashboard data.", variant: "destructive" });
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
        if (profile?.role === 'admin') {
            setIsAdmin(true);
            fetchData();
        } else {
            router.push('/profile');
        }
    }, [user, profile, authLoading, router, fetchData]);

     if (loading || authLoading) {
        return (
           <div className="flex min-h-dvh w-full items-center justify-center bg-secondary/50 p-4">
            <div className="w-full max-w-6xl space-y-6">
              <Skeleton className="h-8 w-48" />
              <div className="grid gap-4 md:grid-cols-3">
                 <Skeleton className="h-28 w-full" />
                 <Skeleton className="h-28 w-full" />
                 <Skeleton className="h-28 w-full" />
              </div>
               <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-32" />
                </CardHeader>
                 <CardContent>
                    <Skeleton className="h-64 w-full" />
                 </CardContent>
               </Card>
            </div>
           </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-4 text-center">
                <Alert variant="destructive" className="max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Access Denied</AlertTitle>
                    <AlertDescription>
                       You must be an administrator to view this page.
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
    
    const pendingBookings = bookings.filter(b => b.status === 'pending').length;
    const completedTrips = bookings.filter(b => b.status === 'completed').length;


    return (
        <div className="min-h-dvh w-full bg-secondary/50">
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center justify-between">
                    <div className="flex items-center gap-4">
                         <Button asChild variant="outline" size="icon">
                            <Link href="/admin">
                                <ArrowLeft className="h-4 w-4" />
                                <span className="sr-only">Back to Admin</span>
                            </Link>
                        </Button>
                        <h1 className="flex items-center gap-2 font-bold text-lg">
                            <Shield className="h-6 w-6 text-primary" />
                            ERP Dashboard
                        </h1>
                    </div>
                </div>
            </header>

            <main className="container mx-auto p-4 sm:p-6 md:p-8">
                <Tabs defaultValue="financials">
                    <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                        <TabsTrigger value="financials">Financials</TabsTrigger>
                        <TabsTrigger value="fleet">Fleet</TabsTrigger>
                        <TabsTrigger value="crew">Crew</TabsTrigger>
                        <TabsTrigger value="bookings">Bookings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="financials" className="mt-6">
                        <div className="space-y-6">
                            {/* Financial Overview */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><DollarSign/>Financial Overview</CardTitle>
                                    <CardDescription>A summary of all revenue and payouts across the platform.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-4 md:grid-cols-3">
                                        <Card className="p-4">
                                            <CardHeader className="p-2 pt-0">
                                                 <CardTitle className="text-sm font-medium flex items-center justify-between">Total Revenue <Banknote/></CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-2 pb-0">
                                                <div className="text-2xl font-bold">Ksh {totalRevenue.toLocaleString()}</div>
                                                <p className="text-xs text-muted-foreground">From {financials.length} completed trips</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="p-4">
                                            <CardHeader className="p-2 pt-0">
                                                 <CardTitle className="text-sm font-medium flex items-center justify-between">Platform Fees <Shield/></CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-2 pb-0">
                                                <div className="text-2xl font-bold">Ksh {totalPlatformFee.toLocaleString()}</div>
                                                 <p className="text-xs text-muted-foreground">20% of total revenue</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="p-4">
                                            <CardHeader className="p-2 pt-0">
                                                 <CardTitle className="text-sm font-medium flex items-center justify-between">Owner & Captain Payouts <UserCheck/></CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-2 pb-0">
                                                <div className="text-2xl font-bold">Ksh {totalPayouts.toLocaleString()}</div>
                                                <p className="text-xs text-muted-foreground">Total amount due to partners</p>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </CardContent>
                            </Card>

                             {/* Trip Financials Table */}
                             <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><BarChart/>Trip Financials</CardTitle>
                                    <CardDescription>A detailed breakdown of each completed trip's financials.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Booking ID</TableHead>
                                                <TableHead>Completed On</TableHead>
                                                <TableHead className="text-right">Total Fare</TableHead>
                                                <TableHead className="text-right">Platform Fee</TableHead>
                                                <TableHead className="text-right">Captain Share</TableHead>
                                                <TableHead className="text-right">Owner Share</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {financials.map(item => (
                                                <TableRow key={item._id}>
                                                    <TableCell className="font-mono text-xs">{item.bookingId}</TableCell>
                                                    <TableCell>{new Date(item.tripCompletedAt).toLocaleString()}</TableCell>
                                                    <TableCell className="text-right font-semibold">Ksh {item.totalFare.toLocaleString()}</TableCell>
                                                    <TableCell className="text-right text-red-600">Ksh {item.platformFee.toLocaleString()}</TableCell>
                                                    <TableCell className="text-right text-green-600">Ksh {item.captainCommission.toLocaleString()}</TableCell>
                                                    <TableCell className="text-right text-green-600">Ksh {item.boatOwnerShare.toLocaleString()}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                     {financials.length === 0 && !loading && (
                                        <p className="text-center text-muted-foreground py-8">No financial data available. Complete a trip to see data here.</p>
                                    )}
                                </CardContent>
                             </Card>
                        </div>
                    </TabsContent>
                    <TabsContent value="fleet" className="mt-6">
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Ship/>Fleet Overview</CardTitle>
                                <CardDescription>Manage and monitor all boats registered on the platform.</CardDescription>
                            </CardHeader>
                            <CardContent>
                               <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Boat Name</TableHead>
                                            <TableHead>Owner</TableHead>
                                            <TableHead>Assigned Captain</TableHead>
                                            <TableHead>License #</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fleet.map(boat => (
                                            <TableRow key={boat._id}>
                                                <TableCell className="font-medium">{boat.name}</TableCell>
                                                <TableCell>{boat.owner.name} <span className="text-muted-foreground text-xs">({boat.owner.email})</span></TableCell>
                                                <TableCell>{boat.captain ? `${boat.captain.name}` : <span className="text-muted-foreground italic">None</span>}</TableCell>
                                                <TableCell className="font-mono text-xs">{boat.licenseNumber}</TableCell>
                                                <TableCell>
                                                    <Badge variant={boat.isValidated ? 'default' : 'secondary'}>{boat.isValidated ? 'Validated' : 'Pending'}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {fleet.length === 0 && !loading && (
                                    <p className="text-center text-muted-foreground py-8">No boats have been registered yet.</p>
                                )}
                            </CardContent>
                         </Card>
                    </TabsContent>
                     <TabsContent value="crew" className="mt-6">
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><UserSquare/>Crew Performance</CardTitle>
                                <CardDescription>Track captain performance and earnings.</CardDescription>
                            </CardHeader>
                            <CardContent>
                               <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Captain Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Trips Completed</TableHead>
                                            <TableHead className="text-right">Total Commission Earned</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {crew.map(member => (
                                            <TableRow key={member._id}>
                                                <TableCell className="font-medium">{member.name}</TableCell>
                                                <TableCell>{member.email}</TableCell>
                                                <TableCell>{member.tripCount}</TableCell>
                                                <TableCell className="text-right font-semibold text-green-600">Ksh {member.totalCommission.toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                 {crew.length === 0 && !loading && (
                                    <p className="text-center text-muted-foreground py-8">No captains have completed trips yet.</p>
                                )}
                            </CardContent>
                         </Card>
                    </TabsContent>
                     <TabsContent value="bookings" className="mt-6">
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><BookOpen/>Booking Overview</CardTitle>
                                    <CardDescription>A high-level summary of all booking activity.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-4 md:grid-cols-3">
                                        <Card className="p-4">
                                            <CardHeader className="p-2 pt-0"><CardTitle className="text-sm font-medium">Total Bookings</CardTitle></CardHeader>
                                            <CardContent className="p-2 pb-0"><div className="text-2xl font-bold">{bookings.length}</div></CardContent>
                                        </Card>
                                         <Card className="p-4">
                                            <CardHeader className="p-2 pt-0"><CardTitle className="text-sm font-medium">Pending Confirmation</CardTitle></CardHeader>
                                            <CardContent className="p-2 pb-0"><div className="text-2xl font-bold">{pendingBookings}</div></CardContent>
                                        </Card>
                                         <Card className="p-4">
                                            <CardHeader className="p-2 pt-0"><CardTitle className="text-sm font-medium">Completed Trips</CardTitle></CardHeader>
                                            <CardContent className="p-2 pb-0"><div className="text-2xl font-bold">{completedTrips}</div></CardContent>
                                        </Card>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>All Bookings</CardTitle>
                                    <CardDescription>A detailed log of all bookings made on the platform.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Rider</TableHead>
                                                <TableHead>Boat</TableHead>
                                                <TableHead>Route</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {bookings.map(booking => (
                                                <TableRow key={booking._id}>
                                                    <TableCell>{booking.rider?.name || "N/A"}</TableCell>
                                                    <TableCell>{booking.boat?.name || "N/A"}</TableCell>
                                                    <TableCell className="text-xs">{booking.pickup} to {booking.destination}</TableCell>
                                                    <TableCell>{new Date(booking.createdAt).toLocaleDateString()}</TableCell>
                                                    <TableCell><Badge variant={booking.status === 'completed' ? 'default' : booking.status === 'pending' ? 'secondary' : 'destructive'}>{booking.status}</Badge></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                     {bookings.length === 0 && !loading && (
                                        <p className="text-center text-muted-foreground py-8">No bookings have been made yet.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}
