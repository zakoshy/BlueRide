
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Users, AlertCircle, LogOut, Ship, PlusCircle, CheckCircle, XCircle, UserPlus, Anchor, BarChart3, Ban, DollarSign, Send, Star, MessageSquare, Route as RouteIcon } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { Combobox } from "@/components/ui/combobox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";


interface ManagedUser {
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
    type: 'standard' | 'luxury' | 'speed';
}

interface Route {
    _id: string;
    from: string;
    to: string;
    fare_per_person_kes: number;
}

interface FareProposal {
    _id: string;
    routeId: string;
    ownerId: string;
    proposedFare: number;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    owner: { name: string };
    route: { from: string; to: string; currentFare: number };
}

interface Review {
    _id: string;
    rating: number;
    comment: string;
    createdAt: string;
    rider: { name: string };
    boat: { name: string };
    owner: { name: string };
}

export default function AdminPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [boatRoutes, setBoatRoutes] = useState<Record<string, Route[]>>({});
  const [fareProposals, setFareProposals] = useState<FareProposal[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  
  const [selectedOwner, setSelectedOwner] = useState<ManagedUser | null>(null);
  const [isManageBoatsDialogOpen, setManageBoatsDialogOpen] = useState(false);
  const [isAddBoatDialogOpen, setAddBoatDialogOpen] = useState(false);
  
  const [isPromoteUserDialogOpen, setPromoteUserDialogOpen] = useState(false);
  const [userToPromote, setUserToPromote] = useState('');
  const [roleToPromote, setRoleToPromote] = useState<'boat_owner' | 'captain'>('boat_owner');
  const [isPromoteCaptainDialogOpen, setPromoteCaptainDialogOpen] = useState(false);

  // Add Boat state
  const [newBoatName, setNewBoatName] = useState('');
  const [newBoatCapacity, setNewBoatCapacity] = useState('');
  const [newBoatDescription, setNewBoatDescription] = useState('');
  const [newBoatLicense, setNewBoatLicense] = useState('');
  const [newBoatType, setNewBoatType] = useState<'standard' | 'luxury' | 'speed'>('standard');
  const [newBoatRoutes, setNewBoatRoutes] = useState<string[]>([]);
  const [routeSearch, setRouteSearch] = useState("");


  const fetchAdminData = useCallback(async () => {
    try {
        const [usersRes, proposalsRes, reviewsRes, routesRes] = await Promise.all([
            fetch('/api/admin/users'),
            fetch('/api/fare-proposals'),
            fetch('/api/reviews'),
            fetch('/api/routes/fares'),
        ]);

      if (usersRes.ok) setUsers(await usersRes.json());
      else toast({ title: "Error", description: "Failed to fetch users.", variant: "destructive" });

      if (proposalsRes.ok) setFareProposals(await proposalsRes.json());
      else toast({ title: "Error", description: "Failed to fetch fare proposals.", variant: "destructive" });

      if (reviewsRes.ok) setReviews(await reviewsRes.json());
      else toast({ title: "Error", description: "Failed to fetch reviews.", variant: "destructive" });
        
      if (routesRes.ok) setRoutes(await routesRes.json());
      else toast({ title: "Error", description: "Failed to fetch routes.", variant: "destructive" });


    } catch (error) {
      console.error("Failed to fetch admin data", error);
      toast({ title: "Error", description: "An unexpected error occurred while fetching admin data.", variant: "destructive" });
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
      fetchAdminData();
    } else {
      router.push('/profile');
    }
    setLoading(false);
  }, [user, profile, authLoading, router, fetchAdminData]);
  
  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };
  
  const getInitials = (name?: string | null) => {
    if (!name) return "";
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  
    const fetchBoatsForOwner = useCallback(async (ownerId: string) => {
        if (!ownerId) return;
        try {
            const response = await fetch(`/api/boats?ownerId=${ownerId}`);
            if (response.ok) {
                const data: Boat[] = await response.json();
                setBoats(data);
                // Fetch routes for each boat
                const routesData: Record<string, Route[]> = {};
                for (const boat of data) {
                    const routesRes = await fetch(`/api/boats/routes?boatId=${boat._id}`);
                    if (routesRes.ok) {
                        routesData[boat._id] = await routesRes.json();
                    }
                }
                setBoatRoutes(routesData);
            } else {
                toast({ title: "Error", description: "Failed to fetch boats for this owner.", variant: "destructive" });
                setBoats([]);
                setBoatRoutes({});
            }
        } catch (error) {
            console.error("Failed to fetch boats", error);
            toast({ title: "Error", description: "An unexpected error occurred while fetching boats.", variant: "destructive" });
            setBoats([]);
            setBoatRoutes({});
        }
    }, [toast]);

  const handleManageBoatsClick = (owner: ManagedUser) => {
      setSelectedOwner(owner);
      fetchBoatsForOwner(owner.uid);
      setManageBoatsDialogOpen(true);
  }
  
  const handleAddBoat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOwner) return;

    try {
        const response = await fetch('/api/boats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: newBoatName,
                capacity: parseInt(newBoatCapacity, 10),
                description: newBoatDescription,
                licenseNumber: newBoatLicense,
                ownerId: selectedOwner.uid,
                type: newBoatType,
                routeIds: newBoatType === 'standard' ? newBoatRoutes : []
            }),
        });

        if (response.ok) {
            toast({ title: "Success", description: "New boat added successfully. It is pending validation." });
            setNewBoatName('');
            setNewBoatCapacity('');
            setNewBoatDescription('');
            setNewBoatLicense('');
            setNewBoatRoutes([]);
            setNewBoatType('standard');
            setAddBoatDialogOpen(false);
            fetchBoatsForOwner(selectedOwner.uid); // Refresh the list
        } else {
            const errorData = await response.json();
            toast({ title: "Add Failed", description: errorData.message || "Could not add boat.", variant: "destructive" });
        }
    } catch (error) {
        console.error("Failed to add boat", error);
        toast({ title: "Error", description: "An unexpected error occurred while adding the boat.", variant: "destructive" });
    }
  }


  const handleRoleChange = async (uid: string, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/users`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, role: newRole }),
      });

      if (response.ok) {
        toast({ title: "Success", description: "User role updated successfully." });
        fetchAdminData(); // Refresh user list
        return true;
      } else {
        const errorData = await response.json();
        toast({ title: "Update Failed", description: errorData.message || "Could not update user role.", variant: "destructive" });
        return false;
      }
    } catch (error) {
        console.error("Failed to update user role", error);
        toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
        return false;
    }
  };

  const handlePromoteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToPromote) {
        toast({ title: "Error", description: "Please select a user to promote.", variant: "destructive" });
        return;
    }
    const success = await handleRoleChange(userToPromote, roleToPromote);
    if (success) {
      setUserToPromote('');
      if (roleToPromote === 'boat_owner') {
        setPromoteUserDialogOpen(false);
      } else {
        setPromoteCaptainDialogOpen(false);
      }
    }
  }
  
    const handleNewBoatRouteAssignmentChange = (routeId: string, isChecked: boolean) => {
        setNewBoatRoutes(prev => {
            if (isChecked) {
                return [...prev, routeId];
            } else {
                return prev.filter(id => id !== routeId);
            }
        });
    };
    
    const filteredDialogRoutes = useMemo(() => {
        return routes.filter(route => 
            route.from.toLowerCase().includes(routeSearch.toLowerCase()) ||
            route.to.toLowerCase().includes(routeSearch.toLowerCase())
        );
    }, [routes, routeSearch]);

  const handleBoatValidationStatusChange = async (boatId: string, status: boolean) => {
    if (!selectedOwner) return;
    try {
        const response = await fetch(`/api/boats`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ boatId, isValidated: status }),
        });

        if (response.ok) {
            toast({ title: "Success", description: `Boat status has been updated.` });
            fetchBoatsForOwner(selectedOwner.uid); // Refresh the list
        } else {
            const errorData = await response.json();
            toast({ title: "Update Failed", description: errorData.message || "Could not update boat status.", variant: "destructive" });
        }
    } catch (error) {
        console.error("Failed to update boat status", error);
        toast({ title: "Error", description: "An unexpected error occurred during status update.", variant: "destructive" });
    }
  }

  const handleFareProposal = async (proposalId: string, status: 'approved' | 'rejected') => {
    try {
        const response = await fetch('/api/fare-proposals', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ proposalId, status }),
        });

        if (response.ok) {
            toast({ title: "Success", description: `Fare proposal has been ${status}.` });
            fetchAdminData(); // Refresh proposals list
        } else {
            const errorData = await response.json();
            toast({ title: "Action Failed", description: errorData.message || "Could not process fare proposal.", variant: "destructive" });
        }
    } catch (error) {
        console.error("Error processing fare proposal:", error);
        toast({ title: "Error", description: "An unexpected error occurred while processing the proposal.", variant: "destructive" });
    }
  }

    const handleBulkFareProposal = async (status: 'approved' | 'rejected') => {
        const pendingIds = pendingProposals.map(p => p._id);
        if (pendingIds.length === 0) return;

        try {
            const response = await fetch('/api/fare-proposals', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ proposalIds: pendingIds, status }),
            });

            if (response.ok) {
                toast({ title: "Success", description: `All pending proposals have been ${status}.` });
                fetchAdminData(); // Refresh proposals list
            } else {
                const errorData = await response.json();
                toast({ title: "Bulk Action Failed", description: errorData.message || "Could not process all proposals.", variant: "destructive" });
            }
        } catch (error) {
            console.error("Error processing bulk fare proposals:", error);
            toast({ title: "Error", description: "An unexpected error occurred during the bulk action.", variant: "destructive" });
        }
    };


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
                <div className="grid gap-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
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
  
  const riderUsers = users.filter(u => u.role === 'rider');
  const riderOptions = riderUsers.map(u => ({ value: u.uid, label: `${u.name} (${u.email})`}));
  const pendingProposals = fareProposals.filter(p => p.status === 'pending');

  return (
    <div className="min-h-dvh w-full bg-secondary/50">
       <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold">
                <Shield className="h-6 w-6 text-primary" />
                Admin Dashboard
            </Link>
             <nav className="flex items-center gap-2">
             {loading || !user ? (
              <div className="h-10 w-28 animate-pulse rounded-md bg-muted" />
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
                      <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                   <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <Shield className="mr-2 h-4 w-4" />
                        <span>Admin Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 md:p-8">
        <h1 className="text-3xl font-bold mb-2">Welcome, {user?.displayName || 'Admin'}!</h1>
        <p className="text-muted-foreground mb-8">Manage users, roles, boats, and review fare proposals.</p>
        
        <Tabs defaultValue="users">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="users">User Management</TabsTrigger>
                <TabsTrigger value="fares">Fare Proposals {pendingProposals.length > 0 && <Badge className="ml-2">{pendingProposals.length}</Badge>}</TabsTrigger>
                <TabsTrigger value="reviews">Rider Reviews</TabsTrigger>
                <TabsTrigger value="erp">ERP &amp; Analytics</TabsTrigger>
            </TabsList>
            <TabsContent value="users" className="mt-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2"><Users /> User Management</CardTitle>
                      <CardDescription>View all users and modify their roles. Boat owners can have their boats managed from here.</CardDescription>
                    </div>
                     <div className="flex gap-2">
                        <Dialog open={isPromoteUserDialogOpen} onOpenChange={setPromoteUserDialogOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={() => { setUserToPromote(''); setRoleToPromote('boat_owner'); setPromoteUserDialogOpen(true); }}><UserPlus className="mr-2 h-4 w-4"/>Promote to Owner</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Promote Rider to Boat Owner</DialogTitle>
                                    <DialogDescription>
                                        Select a 'Rider' to promote them to a 'Boat Owner'.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handlePromoteUser}>
                                    <div className="grid gap-4 py-4">
                                       <Label htmlFor="user-to-promote">Select Rider</Label>
                                       <Combobox
                                            options={riderOptions}
                                            selectedValue={userToPromote}
                                            onSelect={setUserToPromote}
                                            placeholder="Select a user to promote..."
                                            searchPlaceholder="Search riders..."
                                            notFoundText="No riders found."
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" disabled={!userToPromote}>Promote to Boat Owner</Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                         <Dialog open={isPromoteCaptainDialogOpen} onOpenChange={setPromoteCaptainDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="secondary" onClick={() => { setUserToPromote(''); setRoleToPromote('captain'); setPromoteCaptainDialogOpen(true); }}><Anchor className="mr-2 h-4 w-4"/>Promote to Captain</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Promote Rider to Captain</DialogTitle>
                                    <DialogDescription>
                                        Select a 'Rider' to promote them to a 'Captain'.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handlePromoteUser}>
                                    <div className="grid gap-4 py-4">
                                       <Label htmlFor="user-to-promote-captain">Select Rider</Label>
                                       <Combobox
                                            options={riderOptions}
                                            selectedValue={userToPromote}
                                            onSelect={setUserToPromote}
                                            placeholder="Select a user to promote..."
                                            searchPlaceholder="Search riders..."
                                            notFoundText="No riders found."
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" disabled={!userToPromote}>Promote to Captain</Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                         </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead className="text-right"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((u) => (
                          <TableRow key={u._id}>
                            <TableCell className="font-medium">{u.name}</TableCell>
                            <TableCell className="text-muted-foreground">{u.email}</TableCell>
                            <TableCell>
                              <Badge variant={u.role === 'admin' ? 'destructive' : u.role === 'boat_owner' ? 'default' : u.role === 'captain' ? 'secondary' : 'outline'}>{u.role}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                                {u.role === 'boat_owner' && (
                                    <Button variant="outline" size="sm" onClick={() => handleManageBoatsClick(u)}>
                                        <Ship className="mr-2 h-4 w-4"/>
                                        Manage Boats
                                    </Button>
                                )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
            </TabsContent>
             <TabsContent value="fares" className="mt-6">
                 <Card>
                    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2"><DollarSign/>Pending Fare Proposals</CardTitle>
                            <CardDescription>Review and approve or reject fare changes proposed by boat owners.</CardDescription>
                        </div>
                        <div className="flex w-full sm:w-auto items-center gap-2">
                             <Button variant="destructive" size="sm" onClick={() => handleBulkFareProposal('rejected')} disabled={pendingProposals.length === 0}>
                                <Ban className="mr-2 h-4 w-4"/>Reject All
                            </Button>
                             <Button variant="default" size="sm" onClick={() => handleBulkFareProposal('approved')} disabled={pendingProposals.length === 0}>
                                <CheckCircle className="mr-2 h-4 w-4"/>Approve All
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                         {pendingProposals.length > 0 ? (
                           <Table>
                                <TableHeader>
                                <TableRow>
                                    <TableHead>Owner</TableHead>
                                    <TableHead>Route</TableHead>
                                    <TableHead>Current Fare</TableHead>
                                    <TableHead>Proposed Fare</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                {pendingProposals.map((p) => (
                                    <TableRow key={p._id}>
                                        <TableCell>{p.owner.name}</TableCell>
                                        <TableCell className="text-xs">{p.route.from}<br/>to {p.route.to}</TableCell>
                                        <TableCell>Ksh {p.route.currentFare.toLocaleString()}</TableCell>
                                        <TableCell className="font-bold">Ksh {p.proposedFare.toLocaleString()}</TableCell>
                                        <TableCell>{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button size="sm" variant="destructive" onClick={() => handleFareProposal(p._id, 'rejected')}>
                                                <XCircle className="mr-2 h-4 w-4"/> Reject
                                            </Button>
                                            <Button size="sm" variant="default" onClick={() => handleFareProposal(p._id, 'approved')}>
                                                <CheckCircle className="mr-2 h-4 w-4"/> Approve
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                </TableBody>
                            </Table>
                        ) : (
                           <p className="text-center text-muted-foreground py-8">There are no pending fare proposals.</p>
                        )}
                    </CardContent>
                 </Card>
            </TabsContent>
            <TabsContent value="reviews" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><MessageSquare /> Rider Reviews</CardTitle>
                        <CardDescription>Feedback submitted by riders about their trips. Use this to monitor service quality.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {reviews.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Rider</TableHead>
                                        <TableHead>Boat (Owner)</TableHead>
                                        <TableHead>Rating</TableHead>
                                        <TableHead>Comment</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reviews.map((review) => (
                                        <TableRow key={review._id}>
                                            <TableCell>{new Date(review.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell>{review.rider.name}</TableCell>
                                            <TableCell>{review.boat.name} <span className="text-muted-foreground text-xs">({review.owner.name})</span></TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">{review.comment}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">No reviews have been submitted yet.</p>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="erp" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 />
                            ERP &amp; Analytics
                        </CardTitle>
                        <CardDescription>
                            Access financial data, fleet health, and performance metrics.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/erp">Go to ERP Dashboard</Link>
                        </Button>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </main>
      
      {/* Manage Boats Dialog */}
       <Dialog open={isManageBoatsDialogOpen} onOpenChange={setManageBoatsDialogOpen}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Manage Boats for {selectedOwner?.name}</DialogTitle>
                    <DialogDescription>
                        View, validate, add, or edit boats for this owner.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Current Fleet</h3>
                        <Dialog open={isAddBoatDialogOpen} onOpenChange={setAddBoatDialogOpen}>
                            <DialogTrigger asChild>
                                 <Button size="sm"><PlusCircle className="mr-2 h-4 w-4"/>Add New Boat</Button>
                            </DialogTrigger>
                             <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                <DialogTitle>Add New Boat</DialogTitle>
                                <DialogDescription>
                                    Fill in the details for the new boat. It will be added as 'Pending Validation'.
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

                                    {newBoatType === 'standard' && (
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
                                                            id={`admin-new-boat-route-${route._id}`}
                                                            checked={newBoatRoutes.includes(route._id)}
                                                            onCheckedChange={(checked) => handleNewBoatRouteAssignmentChange(route._id, !!checked)}
                                                        />
                                                        <Label htmlFor={`admin-new-boat-route-${route._id}`} className="flex-1 cursor-pointer text-xs font-normal">
                                                            {route.from} to {route.to}
                                                        </Label>
                                                    </div>
                                                ))}
                                                </div>
                                            </ScrollArea>
                                        </div>
                                    )}
                                </div>
                                <DialogFooter>
                                    <Button type="submit">Save Boat</Button>
                                </DialogFooter>
                                </form>
                                </ScrollArea>
                            </DialogContent>
                        </Dialog>
                    </div>
                     {boats.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Assigned Routes</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {boats.map((boat) => (
                                <TableRow key={boat._id}>
                                    <TableCell className="font-medium">{boat.name}</TableCell>
                                    <TableCell className="capitalize">{boat.type}</TableCell>
                                     <TableCell>
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                           <RouteIcon className="h-4 w-4" />
                                           <span>{(boatRoutes[boat._id] || []).length} route(s)</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={boat.isValidated ? 'default' : 'destructive'} className={boat.isValidated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                            {boat.isValidated ? 
                                                <><CheckCircle className="mr-1 h-3 w-3"/> Validated</> : 
                                                <><XCircle className="mr-1 h-3 w-3"/> Suspended / Pending</>
                                            }
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {boat.isValidated ? (
                                            <Button variant="destructive" size="sm" onClick={() => handleBoatValidationStatusChange(boat._id, false)}>
                                                <Ban className="mr-2 h-4 w-4" /> Suspend
                                            </Button>
                                        ) : (
                                            <Button variant="outline" size="sm" onClick={() => handleBoatValidationStatusChange(boat._id, true)}>
                                                <CheckCircle className="mr-2 h-4 w-4" /> Validate
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     ) : (
                        <p className="text-center text-muted-foreground py-4">This owner has no boats yet.</p>
                     )}
                </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}

    