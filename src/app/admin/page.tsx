
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, UserCog, Users, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface ManagedUser {
  _id: string;
  uid: string;
  name: string;
  email: string;
  role: 'rider' | 'boat_owner' | 'admin';
  createdAt: string;
}

export default function AdminPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

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

  const handleRoleChange = async (uid: string, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/users`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, role: newRole }),
      });

      if (response.ok) {
        toast({ title: "Success", description: "User role updated successfully." });
        // Refetch users to show the updated role
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

  return (
    <div className="min-h-dvh w-full bg-secondary/50">
       <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
            <Link href="/admin" className="flex items-center gap-2 font-bold">
                <Shield className="h-6 w-6 text-primary" />
                Admin Dashboard
            </Link>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 md:p-8">
        <h1 className="text-3xl font-bold mb-2">Welcome, {user?.displayName || 'Admin'}!</h1>
        <p className="text-muted-foreground mb-8">Manage users and system settings.</p>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users /> User Management</CardTitle>
            <CardDescription>View all users and modify their roles.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Change Role</TableHead>
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
                    <TableCell className="text-right">
                       <Select
                          defaultValue={u.role}
                          onValueChange={(newRole) => handleRoleChange(u.uid, newRole)}
                          disabled={u.uid === user.uid} // Admin can't change their own role
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rider">Rider</SelectItem>
                            <SelectItem value="boat_owner">Boat Owner</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
