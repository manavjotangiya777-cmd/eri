import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { createFollowUp } from '@/db/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { FollowUp, FollowUpTaskType, Profile } from '@/types';

interface FollowUpCreateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    targetUser?: Profile | null;
    onSuccess?: () => void;
}

const TASK_TYPES: Record<FollowUpTaskType, string> = {
    update_levanu: 'Update Levanu',
    work_karavanu: 'Work Karavanu',
    document_collect: 'Document Collect Karavanu',
    client_followup: 'Client Follow-Up',
    payment_followup: 'Payment Follow-Up',
    internal_coordination: 'Internal Coordination',
};

const RELATED_TYPES = ['client', 'employee', 'vendor', 'department', 'other'];
const COMM_METHODS = ['call', 'whatsapp', 'email', 'meeting', 'other'];

export default function FollowUpCreateDialog({ open, onOpenChange, targetUser, onSuccess }: FollowUpCreateDialogProps) {
    const { profile } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const emptyForm: Partial<FollowUp> & { required_items_text?: string } = {
        title: '',
        task_type: 'client_followup',
        related_name: targetUser ? (targetUser.full_name || targetUser.username) : '',
        related_type: 'employee',
        assigned_to: targetUser?.id || null,
        assigned_by: profile?.id || null,
        description: '',
        required_items: [],
        required_items_text: '',
        communication_method: 'call',
        deadline: '',
        next_action_date: '',
        status: 'pending',
    };

    const [formData, setFormData] = useState<typeof emptyForm>(emptyForm);

    useEffect(() => {
        if (open && targetUser) {
            setFormData(prev => ({
                ...prev,
                related_name: targetUser.full_name || targetUser.username,
                assigned_to: targetUser.id || (targetUser as any)._id,
                assigned_by: profile?.id || null,
            }));
        } else if (open) {
            setFormData(emptyForm);
        }
    }, [open, targetUser, profile]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title?.trim()) {
            toast({ title: 'Error', description: 'Title is required', variant: 'destructive' });
            return;
        }
        setLoading(true);
        try {
            const required_items = (formData.required_items_text || '')
                .split('\n').map(s => s.trim()).filter(Boolean);

            const payload: Partial<FollowUp> = {
                ...formData,
                required_items,
                deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
                next_action_date: formData.next_action_date ? new Date(formData.next_action_date).toISOString() : null,
                assigned_by: profile?.id || null,
            };
            delete (payload as any).required_items_text;

            await createFollowUp(payload);
            toast({ title: 'Success', description: 'Follow-up created successfully' });
            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (err: any) {
            toast({ title: 'Error', description: err?.message || 'Save failed', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Follow-Up</DialogTitle>
                    <DialogDescription>
                        {targetUser ? `Assign a follow-up task to ${targetUser.full_name || targetUser.username}` : 'Assign a new follow-up task'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSave} className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Follow-Up Title</Label>
                        <Input
                            placeholder="e.g. Documentation update for project X"
                            value={formData.title ?? ""}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Task Type</Label>
                            <Select
                                value={formData.task_type}
                                onValueChange={v => setFormData({ ...formData, task_type: v as FollowUpTaskType })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.entries(TASK_TYPES).map(([k, v]) => (
                                        <SelectItem key={k} value={k}>{v}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Related Type</Label>
                            <Select
                                value={formData.related_type}
                                onValueChange={v => setFormData({ ...formData, related_type: v as any })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {RELATED_TYPES.map(t => (
                                        <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Detailed Description</Label>
                        <Textarea
                            placeholder="What needs to be done?"
                            value={formData.description ?? ""}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Deadline</Label>
                            <Input
                                type="date"
                                value={formData.deadline ?? ""}
                                onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Comm. Method</Label>
                            <Select
                                value={formData.communication_method}
                                onValueChange={v => setFormData({ ...formData, communication_method: v as any })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {COMM_METHODS.map(m => (
                                        <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Follow-Up'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
