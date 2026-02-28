import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { getAllowedNetworks, createAllowedNetwork, deleteAllowedNetwork } from '@/db/api';
import type { AllowedNetwork } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Shield, Plus, Trash2, Globe, Wifi, Key } from 'lucide-react';

export default function NetworkSecurityPage() {
    const [networks, setNetworks] = useState<AllowedNetwork[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newNetwork, setNewNetwork] = useState({ ip_address: '', description: '' });
    const { toast } = useToast();

    const loadNetworks = async () => {
        setLoading(true);
        try {
            const data = await getAllowedNetworks();
            setNetworks(data);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to load allowed networks',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNetworks();
    }, []);

    const handleAddNetwork = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNetwork.ip_address) return;

        setCreating(true);
        try {
            await createAllowedNetwork(newNetwork);
            toast({
                title: 'Success',
                description: 'Network IP added successfully',
            });
            setNewNetwork({ ip_address: '', description: '' });
            loadNetworks();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to add network',
                variant: 'destructive',
            });
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteAllowedNetwork(id);
            toast({
                title: 'Network Removed',
                description: 'IP address has been removed from allowed list',
            });
            loadNetworks();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to remove network',
                variant: 'destructive',
            });
        }
    };

    if (loading && networks.length === 0) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">Network Security</h1>
                        <p className="text-muted-foreground">Manage authorized IP addresses for attendance</p>
                    </div>
                    <Shield className="h-8 w-8 text-primary" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Add New IP Form */}
                    <Card className="lg:col-span-1 border-primary/20 shadow-lg">
                        <CardHeader className="bg-primary/5">
                            <CardTitle className="flex items-center gap-2">
                                <Plus className="h-5 w-5" />
                                Add Authorized IP
                            </CardTitle>
                            <CardDescription>Limit Clock In/Out to these office networks</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form onSubmit={handleAddNetwork} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="ip_address">IP Address (IPv4 or IPv6)</Label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="ip_address"
                                            placeholder="e.g. 103.1.2.3"
                                            className="pl-9"
                                            value={newNetwork.ip_address}
                                            onChange={(e) => setNewNetwork({ ...newNetwork, ip_address: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">Use 127.0.0.1 for local testing</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Label / Location</Label>
                                    <div className="relative">
                                        <Wifi className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="description"
                                            placeholder="e.g. Main Office WiFi"
                                            className="pl-9"
                                            value={newNetwork.description}
                                            onChange={(e) => setNewNetwork({ ...newNetwork, description: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <Button type="submit" className="w-full" disabled={creating}>
                                    {creating ? 'Adding...' : 'Authorize Network'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Authorized IPs List */}
                    <Card className="lg:col-span-2 shadow-md">
                        <CardHeader>
                            <CardTitle>Authorized Networks</CardTitle>
                            <CardDescription>Attendance actions are only allowed from these connections for restricted employees.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {networks.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                                    <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                                    <p className="text-muted-foreground font-medium">No IPs configured</p>
                                    <p className="text-sm text-muted-foreground mt-1">Attendance is currently unlocked for all networks.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Label</TableHead>
                                            <TableHead>IP Address</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {networks.map((net) => (
                                            <TableRow key={net.id}>
                                                <TableCell className="font-medium">{net.description || 'Unnamed Location'}</TableCell>
                                                <TableCell className="font-mono text-sm">{net.ip_address}</TableCell>
                                                <TableCell>
                                                    <span className="flex items-center gap-1 text-green-600 text-xs font-bold">
                                                        <span className="h-2 w-2 rounded-full bg-green-600 animate-pulse" />
                                                        ACTIVE
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDelete(net.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Informative Note */}
                <Card className="border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm flex items-center gap-2 text-yellow-800 dark:text-yellow-400">
                            <Key className="h-4 w-4" />
                            Management Authority
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4 pt-0">
                        <p className="text-xs text-yellow-700 dark:text-yellow-300">
                            Administrators and HR personnel can always clock in from any network.
                            Individual employees can be granted "Remote Work Authorization" in the <strong>User Management</strong> section to bypass these IP checks.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
