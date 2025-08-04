
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, DollarSign, BarChart, AlertCircle, Banknote, Ship, UserCheck } from "lucide-react";
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

export default function ErpPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [financials, setFinancials] = useState<TripFinancials[]>([]);
    
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalPlatformFee, setTotalPlatformFee] = useState(0);
    const [totalPayouts, setTotalPayouts] = useState(0);


    const fetchFinancials = useCallback(async () => {
        try {
            const response = await fetch('/api/erp/trip-financials');
            if (response.ok) {
                const data = await response.json();
                setFinancials(data);
                
                // Calculate totals
                const revenue = data.reduce((acc: number, item: TripFinancials) => acc + item.totalFare, 0);
                const platformFee = data.reduce((acc: number, item: TripFinancials) => acc + item.platformFee, 0);
                const payouts = data.reduce((acc: number, item: TripFinancials) => acc + item.boatOwnerShare + item.captainCommission, 0);
                
                setTotalRevenue(revenue);
                setTotalPlatformFee(platformFee);
                setTotalPayouts(payouts);

            } else {
                toast({ title: "Error", description: "Failed to fetch financial data.", variant: "destructive" });
            }
        } catch (error) {
            console.error("Failed to fetch financials", error);
            toast({ title: "Error", description: "An unexpected error occurred while fetching financial data.", variant: "destructive" });
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
            fetchFinancials();
        } else {
            router.push('/profile');
        }
        setLoading(false);
    }, [user, profile, authLoading, router, fetchFinancials]);

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
                        <TabsTrigger value="fleet" disabled>Fleet</TabsTrigger>
                        <TabsTrigger value="crew" disabled>Crew</TabsTrigger>
                        <TabsTrigger value="bookings" disabled>Bookings</TabsTrigger>
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
                                     {financials.length === 0 && (
                                        <p className="text-center text-muted-foreground py-8">No financial data available. Complete a trip to see data here.</p>
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
