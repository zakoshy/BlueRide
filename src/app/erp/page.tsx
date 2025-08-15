
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, DollarSign, BarChart, AlertCircle, Banknote, Ship, UserCheck, BookOpen, UserSquare, ChevronLeft, ChevronRight, PlusCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";


interface TripFinancials {
    _id: string;
    bookingId: string;
    tripCompletedAt: string;
    baseFare: number;
    finalFare: number;
    adjustmentPercent: number;
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
    type: string;
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
    finalFare?: number;
}

interface DailyData {
    date: string;
    [key: string]: number | string;
}

interface Investor {
    _id: string;
    name: string;
    sharePercentage: number;
    createdAt: string;
}

interface InvestorFinancials {
    totalPayout: number;
    tripCount: number;
    dailyPayouts: { date: string; Payout: number }[];
}


export default function ErpPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    
    const [currentDate, setCurrentDate] = useState(new Date());

    // Financials State
    const [financials, setFinancials] = useState<TripFinancials[]>([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalPlatformFee, setTotalPlatformFee] = useState(0);
    const [totalPayouts, setTotalPayouts] = useState(0);
    const [dailyRevenueData, setDailyRevenueData] = useState<DailyData[]>([]);


    // Fleet State
    const [fleet, setFleet] = useState<FleetBoat[]>([]);

    // Crew State
    const [crew, setCrew] = useState<CrewMember[]>([]);

    // Bookings State
    const [bookings, setBookings] = useState<Booking[]>([]);
    
    // Investor State
    const [investors, setInvestors] = useState<Investor[]>([]);
    const [isAddInvestorOpen, setAddInvestorOpen] = useState(false);
    const [newInvestorName, setNewInvestorName] = useState("");
    const [newInvestorShare, setNewInvestorShare] = useState("");
    const [selectedInvestor, setSelectedInvestor] = useState<string>("");
    const [investorFinancials, setInvestorFinancials] = useState<InvestorFinancials | null>(null);


    const fetchInvestors = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/investors');
            if (res.ok) {
                setInvestors(await res.json());
            } else {
                toast({ title: "Error", description: "Failed to fetch investors.", variant: "destructive" });
            }
        } catch (error) {
             toast({ title: "Error", description: "An unexpected error occurred while fetching investors.", variant: "destructive" });
        }
    }, [toast]);

    const fetchInvestorFinancials = useCallback(async (investorId: string, date: Date) => {
        if (!investorId) {
            setInvestorFinancials(null);
            return;
        };
        setIsDataLoading(true);
        const startDate = startOfMonth(date);
        const endDate = endOfMonth(date);
        const query = `?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
        try {
            const res = await fetch(`/api/erp/investor/${investorId}${query}`);
            if (res.ok) {
                setInvestorFinancials(await res.json());
            } else {
                 toast({ title: "Error", description: "Failed to fetch investor financial data.", variant: "destructive" });
                 setInvestorFinancials(null);
            }
        } catch (error) {
             toast({ title: "Error", description: "An unexpected error occurred while fetching investor financials.", variant: "destructive" });
             setInvestorFinancials(null);
        } finally {
            setIsDataLoading(false);
        }
    }, [toast]);


    const fetchData = useCallback(async (date: Date) => {
        setIsDataLoading(true);
        const startDate = startOfMonth(date);
        const endDate = endOfMonth(date);
        const query = `?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;

        try {
            const [financialsRes, fleetRes, crewRes, bookingsRes] = await Promise.all([
                fetch(`/api/erp/trip-financials${query}`),
                fetch('/api/erp/fleet'),
                fetch('/api/erp/crew'),
                fetch('/api/erp/bookings') 
            ]);

            if (financialsRes.ok) {
                const data = await financialsRes.json();
                setFinancials(data);
                const revenue = data.reduce((acc: number, item: TripFinancials) => acc + item.finalFare, 0);
                const platformFee = data.reduce((acc: number, item: TripFinancials) => acc + item.platformFee, 0);
                const payouts = data.reduce((acc: number, item: TripFinancials) => acc + item.boatOwnerShare + item.captainCommission, 0);
                setTotalRevenue(revenue);
                setTotalPlatformFee(platformFee);
                setTotalPayouts(payouts);

                const dailyData: { [key: string]: number } = {};
                data.forEach((item: TripFinancials) => {
                    const day = format(new Date(item.tripCompletedAt), 'MMM dd');
                    if(!dailyData[day]) dailyData[day] = 0;
                    dailyData[day] += item.finalFare;
                });
                const chartData = Object.keys(dailyData).map(date => ({ date, Revenue: dailyData[date] })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                setDailyRevenueData(chartData);

            } else {
                 toast({ title: "Error", description: "Failed to fetch financial data.", variant: "destructive" });
            }

            if(fleetRes.ok) setFleet(await fleetRes.json());
            else toast({ title: "Error", description: "Failed to fetch fleet data.", variant: "destructive" });
            
            if(crewRes.ok) setCrew(await crewRes.json());
            else toast({ title: "Error", description: "Failed to fetch crew data.", variant: "destructive" });

            if(bookingsRes.ok) setBookings(await bookingsRes.json());
            else toast({ title: "Error", description: "Failed to fetch bookings data.", variant: "destructive" });

        } catch (error) {
            console.error("Failed to fetch ERP data", error);
            toast({ title: "Error", description: "An unexpected error occurred while fetching dashboard data.", variant: "destructive" });
        } finally {
            setIsDataLoading(false);
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
            setLoading(false);
            fetchData(currentDate);
            fetchInvestors();
        } else {
            router.push('/profile');
        }
    }, [user, profile, authLoading, router, currentDate, fetchData, fetchInvestors]);

    useEffect(() => {
        if(selectedInvestor) {
            fetchInvestorFinancials(selectedInvestor, currentDate);
        } else {
            setInvestorFinancials(null);
        }
    }, [selectedInvestor, currentDate, fetchInvestorFinancials]);

    
    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    const handleAddInvestor = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/admin/investors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newInvestorName, sharePercentage: parseFloat(newInvestorShare) })
            });

            if (response.ok) {
                toast({ title: "Success", description: "Investor added successfully." });
                setNewInvestorName("");
                setNewInvestorShare("");
                setAddInvestorOpen(false);
                fetchInvestors();
            } else {
                const data = await response.json();
                toast({ title: "Error", description: data.message || "Failed to add investor.", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
        }
    }

    const handleDeleteInvestor = async (investorId: string) => {
         try {
            const response = await fetch(`/api/admin/investors?id=${investorId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                toast({ title: "Success", description: "Investor deleted successfully." });
                fetchInvestors();
                 if (selectedInvestor === investorId) {
                    setSelectedInvestor("");
                }
            } else {
                const data = await response.json();
                toast({ title: "Error", description: data.message || "Failed to delete investor.", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
        }
    }


     if (loading) {
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
    const statusVariant = (status: Booking['status']) => {
        switch (status) {
            case 'confirmed': return 'default';
            case 'completed': return 'secondary';
            case 'rejected': return 'destructive';
            case 'pending': return 'outline';
            default: return 'outline';
        }
    };
    const investorOptions = investors.map(i => ({ value: i._id, label: `${i.name} (${i.sharePercentage}%)` }));


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
                    <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                            <TabsTrigger value="financials">Financials</TabsTrigger>
                            <TabsTrigger value="fleet">Fleet</TabsTrigger>
                            <TabsTrigger value="crew">Crew</TabsTrigger>
                            <TabsTrigger value="bookings">Bookings</TabsTrigger>
                            <TabsTrigger value="investors">Investors</TabsTrigger>
                        </TabsList>
                        <div className="flex items-center gap-2 ml-auto">
                            <Button variant="outline" size="icon" onClick={handlePrevMonth}><ChevronLeft/></Button>
                            <span className="font-semibold text-lg w-36 text-center">{format(currentDate, 'MMMM yyyy')}</span>
                            <Button variant="outline" size="icon" onClick={handleNextMonth}><ChevronRight/></Button>
                        </div>
                    </div>

                    <TabsContent value="financials" className="mt-6">
                       {isDataLoading ? <Skeleton className="h-96 w-full"/> : (
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><DollarSign/>Financial Overview for {format(currentDate, 'MMMM yyyy')}</CardTitle>
                                    <CardDescription>A summary of all revenue and payouts for the selected month.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {financials.length > 0 ? (
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
                                    ) : (
                                       <p className="text-center text-muted-foreground py-8">No financial records to display for this month.</p>
                                    )}
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><BarChart/>Revenue Analytics</CardTitle>
                                    <CardDescription>Daily revenue collection for {format(currentDate, 'MMMM yyyy')}.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                {dailyRevenueData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <RechartsBarChart data={dailyRevenueData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis width={80} tickFormatter={(value) => `Ksh ${value.toLocaleString()}`} />
                                            <Tooltip formatter={(value) => [`Ksh ${Number(value).toLocaleString()}`, "Revenue"]}/>
                                            <Legend />
                                            <Bar dataKey="Revenue" fill="hsl(var(--primary))" />
                                        </RechartsBarChart>
                                    </ResponsiveContainer>
                                 ) : (
                                    <p className="text-center text-muted-foreground py-8">No revenue data available for charting this month.</p>
                                 )}
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><BarChart/>Trip Financials</CardTitle>
                                    <CardDescription>A detailed breakdown of each completed trip's financials for the month.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Booking ID</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Base Fare</TableHead>
                                                <TableHead>Adj. %</TableHead>
                                                <TableHead className="text-right">Final Fare</TableHead>
                                                <TableHead className="text-right">Platform Fee</TableHead>
                                                <TableHead className="text-right">Captain Share</TableHead>
                                                <TableHead className="text-right">Owner Share</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {financials.map(item => (
                                                <TableRow key={item._id}>
                                                    <TableCell className="font-mono text-xs">{item.bookingId}</TableCell>
                                                    <TableCell>{format(new Date(item.tripCompletedAt), 'MMM dd, yyyy')}</TableCell>
                                                    <TableCell>Ksh {item.baseFare.toLocaleString()}</TableCell>
                                                    <TableCell>{item.adjustmentPercent}%</TableCell>
                                                    <TableCell className="text-right font-semibold">Ksh {item.finalFare.toLocaleString()}</TableCell>
                                                    <TableCell className="text-right text-red-600">Ksh {item.platformFee.toLocaleString()}</TableCell>
                                                    <TableCell className="text-right text-green-600">Ksh {item.captainCommission.toLocaleString()}</TableCell>
                                                    <TableCell className="text-right text-green-600">Ksh {item.boatOwnerShare.toLocaleString()}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                     {financials.length === 0 && !isDataLoading && (
                                        <p className="text-center text-muted-foreground py-8">No financial data available for this month.</p>
                                    )}
                                </CardContent>
                             </Card>
                        </div>
                       )}
                    </TabsContent>
                    <TabsContent value="fleet" className="mt-6">
                         {isDataLoading ? <Skeleton className="h-64 w-full"/> : (
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
                                            <TableHead>Type</TableHead>
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
                                                <TableCell className="capitalize">{boat.type}</TableCell>
                                                <TableCell>
                                                    <Badge variant={boat.isValidated ? 'default' : 'secondary'}>{boat.isValidated ? 'Validated' : 'Pending'}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {fleet.length === 0 && !isDataLoading && (
                                    <p className="text-center text-muted-foreground py-8">No boats have been registered yet.</p>
                                )}
                            </CardContent>
                         </Card>
                         )}
                    </TabsContent>
                     <TabsContent value="crew" className="mt-6">
                         {isDataLoading ? <Skeleton className="h-64 w-full"/> : (
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><UserSquare/>Crew Performance</CardTitle>
                                <CardDescription>Track captain performance and earnings. Data is for all time.</CardDescription>
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
                                 {crew.length === 0 && !isDataLoading && (
                                    <p className="text-center text-muted-foreground py-8">No captains have completed trips yet.</p>
                                )}
                            </CardContent>
                         </Card>
                         )}
                    </TabsContent>
                     <TabsContent value="bookings" className="mt-6">
                        {isDataLoading ? <Skeleton className="h-96 w-full"/> : (
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><BookOpen/>Booking Overview</CardTitle>
                                    <CardDescription>A high-level summary of all booking activity (all-time).</CardDescription>
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
                                    <CardTitle>All Bookings (All-time)</CardTitle>
                                    <CardDescription>A detailed log of all bookings made on the platform.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Rider</TableHead>
                                                <TableHead>Boat</TableHead>
                                                <TableHead>Final Fare</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {bookings.map(booking => (
                                                <TableRow key={booking._id}>
                                                    <TableCell>{booking.rider?.name || "N/A"}</TableCell>
                                                    <TableCell>{booking.boat?.name || "N/A"}</TableCell>
                                                    <TableCell>Ksh {booking.finalFare?.toLocaleString() || 'N/A'}</TableCell>
                                                    <TableCell>{new Date(booking.createdAt).toLocaleDateString()}</TableCell>
                                                    <TableCell><Badge variant={statusVariant(booking.status)}>{booking.status}</Badge></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                     {bookings.length === 0 && !isDataLoading && (
                                        <p className="text-center text-muted-foreground py-8">No bookings have been made yet.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                        )}
                    </TabsContent>
                    <TabsContent value="investors" className="mt-6">
                        <div className="grid gap-6 lg:grid-cols-3">
                            <div className="lg:col-span-1 space-y-6">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <div>
                                            <CardTitle>Manage Investors</CardTitle>
                                            <CardDescription>Add, view, or remove investors.</CardDescription>
                                        </div>
                                        <Dialog open={isAddInvestorOpen} onOpenChange={setAddInvestorOpen}>
                                            <DialogTrigger asChild>
                                                <Button size="icon"><PlusCircle className="h-4 w-4" /></Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Add New Investor</DialogTitle>
                                                </DialogHeader>
                                                <form onSubmit={handleAddInvestor} className="space-y-4">
                                                    <div>
                                                        <Label htmlFor="investor-name">Investor Name</Label>
                                                        <Input id="investor-name" value={newInvestorName} onChange={(e) => setNewInvestorName(e.target.value)} required />
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="investor-share">Share Percentage (%)</Label>
                                                        <Input id="investor-share" type="number" value={newInvestorShare} onChange={(e) => setNewInvestorShare(e.target.value)} placeholder="e.g., 50 for 50%" required min="0.01" max="100" step="0.01" />
                                                        <p className="text-xs text-muted-foreground mt-1">This is their share of the 20% platform fee.</p>
                                                    </div>
                                                    <DialogFooter>
                                                        <Button type="submit">Add Investor</Button>
                                                    </DialogFooter>
                                                </form>
                                            </DialogContent>
                                        </Dialog>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Name</TableHead>
                                                    <TableHead>Share</TableHead>
                                                    <TableHead className="text-right"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {investors.map(investor => (
                                                    <TableRow key={investor._id}>
                                                        <TableCell>{investor.name}</TableCell>
                                                        <TableCell>{investor.sharePercentage}%</TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="destructive" size="icon" onClick={() => handleDeleteInvestor(investor._id)}><Trash2 className="h-4 w-4" /></Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        {investors.length === 0 && <p className="text-center text-muted-foreground py-4">No investors added yet.</p>}
                                    </CardContent>
                                </Card>
                            </div>
                            <div className="lg:col-span-2 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Investor Analytics</CardTitle>
                                        <CardDescription>Select an investor to view their earnings for the selected month.</CardDescription>
                                        <div className="pt-2">
                                            <Combobox
                                                options={investorOptions}
                                                selectedValue={selectedInvestor}
                                                onSelect={setSelectedInvestor}
                                                placeholder="Select an investor..."
                                                searchPlaceholder="Search investors..."
                                                notFoundText="No investors found."
                                            />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {isDataLoading && selectedInvestor ? <Skeleton className="h-64 w-full" /> : investorFinancials ? (
                                            <div className="space-y-4">
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <Card className="p-4">
                                                        <CardHeader className="p-2 pt-0">
                                                            <CardTitle className="text-sm font-medium">Total Payout</CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="p-2 pb-0">
                                                            <div className="text-2xl font-bold">Ksh {investorFinancials.totalPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                        </CardContent>
                                                    </Card>
                                                    <Card className="p-4">
                                                        <CardHeader className="p-2 pt-0">
                                                            <CardTitle className="text-sm font-medium">Trips Contributed To</CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="p-2 pb-0">
                                                            <div className="text-2xl font-bold">{investorFinancials.tripCount}</div>
                                                        </CardContent>
                                                    </Card>
                                                </div>
                                                <ResponsiveContainer width="100%" height={250}>
                                                    <RechartsBarChart data={investorFinancials.dailyPayouts}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="date" />
                                                        <YAxis width={80} tickFormatter={(value) => `Ksh ${Number(value).toLocaleString()}`} />
                                                        <Tooltip formatter={(value) => [`Ksh ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Payout"]}/>
                                                        <Legend />
                                                        <Bar dataKey="Payout" fill="hsl(var(--primary))" />
                                                    </RechartsBarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        ) : (
                                            <p className="text-center text-muted-foreground py-8">{selectedInvestor ? 'No financial data for this investor in the selected month.' : 'Please select an investor to see their analytics.'}</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}
