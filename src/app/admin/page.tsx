
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Users, AlertCircle, LogOut, Ship, PlusCircle, CheckCircle, XCircle, UserPlus } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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


interface ManagedUser {
  _id: string;
  uid: string;
  name: string;
  email: string;
  role: 'rider' | 'boat_owner' | 'admin';
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
}

export default function AdminPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<ManagedUser | null>(null);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [isManageBoatsDialogOpen, setManageBoatsDialogOpen] = useState(false);
  const [isAddBoatDialogOpen, setAddBoatDialogOpen] = useState(false);
  const [isPromoteUserDialogOpen, setPromoteUserDialogOpen] = useState(false);
  const [userToPromote, setUserToPromote] = useState('');
  
  const [newBoatName, setNewBoatName] = useState('');
  const [newBoatCapacity, setNewBoatCapacity] = useState('');
  const [newBoatDescription, setNewBoatDescription] = useState('');
  const [newBoatLicense, setNewBoatLicense] = useState('');


  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        toast({ title: "Error", description: "Failed to fetch users.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
      toast({ title: "Error", description: "An unexpected error occurred while fetching users.", variant: "destructive" });
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
      fetchUsers();
    }
    setLoading(false);
  }, [user, profile, authLoading, router, fetchUsers]);
  
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
                const data = await response.json();
                setBoats(data);
            } else {
                toast({ title: "Error", description: "Failed to fetch boats for this owner.", variant: "destructive" });
                setBoats([]);
            }
        } catch (error) {
            console.error("Failed to fetch boats", error);
            toast({ title: "Error", description: "An unexpected error occurred while fetching boats.", variant: "destructive" });
            setBoats([]);
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
                ownerId: selectedOwner.uid
            }),
        });

        if (response.ok) {
            toast({ title: "Success", description: "New boat added successfully. It is pending validation." });
            setNewBoatName('');
            setNewBoatCapacity('');
            setNewBoatDescription('');
            setNewBoatLicense('');
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
        fetchUsers();
      } else {
        const errorData = await response.json();
        toast({ title: "Update Failed", description: errorData.message || "Could not update user role.", variant: "destructive" });
      }
    } catch (error) {
        console.error("Failed to update user role", error);
        toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    }
  };

  const handlePromoteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToPromote) {
        toast({ title: "Error", description: "Please select a user to promote.", variant: "destructive" });
        return;
    }
    await handleRoleChange(userToPromote, 'boat_owner');
    setUserToPromote('');
    setPromoteUserDialogOpen(false);
  }

  const handleValidateBoat = async (boatId: string) => {
    if (!selectedOwner) return;
    try {
        const response = await fetch(`/api/boats`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ boatId, isValidated: true }),
        });

        if (response.ok) {
            toast({ title: "Success", description: "Boat has been validated." });
            fetchBoatsForOwner(selectedOwner.uid); // Refresh the list
        } else {
            const errorData = await response.json();
            toast({ title: "Validation Failed", description: errorData.message || "Could not validate boat.", variant: "destructive" });
        }
    } catch (error) {
        console.error("Failed to validate boat", error);
        toast({ title: "Error", description: "An unexpected error occurred during validation.", variant: "destructive" });
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
        <p className="text-muted-foreground mb-8">Manage users, roles, and boats.</p>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Users /> User Management</CardTitle>
              <CardDescription>View all users and modify their roles. Boat owners can have their boats managed from here.</CardDescription>
            </div>
             <Dialog open={isPromoteUserDialogOpen} onOpenChange={setPromoteUserDialogOpen}>
                <DialogTrigger asChild>
                     <Button><UserPlus className="mr-2 h-4 w-4"/>Promote User</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Promote User to Boat Owner</DialogTitle>
                        <DialogDescription>
                            Select a user with the 'Rider' role to promote them to a 'Boat Owner'.
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
                                notFoundText="No riders available."
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={!userToPromote}>Promote to Boat Owner</Button>
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
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u._id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'admin' ? 'destructive' : u.role === 'boat_owner' ? 'default' : 'secondary'}>{u.role}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                       <Select
                          defaultValue={u.role}
                          onValueChange={(newRole) => handleRoleChange(u.uid, newRole)}
                          disabled={user ? u.uid === user.uid : false}
                        >
                          <SelectTrigger className="w-[130px] inline-flex">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rider">Rider</SelectItem>
                            <SelectItem value="boat_owner">Boat Owner</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
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
      </main>
      
      {/* Manage Boats Dialog */}
       <Dialog open={isManageBoatsDialogOpen} onOpenChange={setManageBoatsDialogOpen}>
            <DialogContent className="sm:max-w-[825px]">
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
                                        <Label htmlFor="capacity" className="text-right">Capacity</Label>
                                        <Input id="capacity" type="number" value={newBoatCapacity} onChange={(e) => setNewBoatCapacity(e.target.value)} className="col-span-3" required/>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="license" className="text-right">License #</Label>
                                        <Input id="license" value={newBoatLicense} onChange={(e) => setNewBoatLicense(e.target.value)} className="col-span-3" required/>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="description" className="text-right">Description</Label>
                                        <Textarea id="description" value={newBoatDescription} onChange={(e) => setNewBoatDescription(e.target.value)} className="col-span-3" required/>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit">Save Boat</Button>
                                </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                     {boats.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Capacity</TableHead>
                                    <TableHead>License #</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {boats.map((boat) => (
                                <TableRow key={boat._id}>
                                    <TableCell className="font-medium">{boat.name}</TableCell>
                                    <TableCell>{boat.capacity}</TableCell>
                                    <TableCell className="font-mono text-xs">{boat.licenseNumber}</TableCell>
                                    <TableCell>
                                        <Badge variant={boat.isValidated ? 'default' : 'secondary'} className={boat.isValidated ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                            {boat.isValidated ? 
                                                <><CheckCircle className="mr-1 h-3 w-3"/> Validated</> : 
                                                <><XCircle className="mr-1 h-3 w-3"/> Pending</>
                                            }
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {!boat.isValidated && (
                                            <Button variant="outline" size="sm" onClick={() => handleValidateBoat(boat._id)}>
                                                Validate
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
