import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Briefcase, CheckSquare, Calendar, ChevronRight, Shield } from 'lucide-react';
import { getDashboardStats } from '@/db/api';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id && profile?.role) {
      getDashboardStats(profile.id, profile.role)
        .then(setStats)
        .finally(() => setLoading(false));
    }
  }, [profile]);

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'text-primary',
    },
    {
      title: 'Total Clients',
      value: stats?.totalClients || 0,
      icon: Briefcase,
      color: 'text-chart-2',
    },
    {
      title: 'Total Tasks',
      value: stats?.totalTasks || 0,
      icon: CheckSquare,
      color: 'text-chart-3',
    },
    {
      title: 'Pending Leaves',
      value: stats?.pendingLeaves || 0,
      icon: Calendar,
      color: 'text-chart-4',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.full_name || profile?.username}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-16 bg-muted" />
                  ) : (
                    <div className="text-2xl font-bold">{stat.value}</div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-lg border-none ring-1 ring-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <Link
                to="/admin/users"
                className="group flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:bg-primary/5 hover:border-primary/20 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Manage Users</div>
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      Add, edit, or remove team member accounts
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors" />
              </Link>

              <Link
                to="/admin/clients"
                className="group flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:bg-primary/5 hover:border-primary/20 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Manage Clients</div>
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      View and manage client profiles and logs
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors" />
              </Link>

              <Link
                to="/admin/tasks"
                className="group flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:bg-primary/5 hover:border-primary/20 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <CheckSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Manage Tasks</div>
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      Create and assign new tasks to the team
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">System Status</div>
                <div className="text-lg font-medium text-chart-2">All Systems Operational</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Active Users</div>
                <div className="text-lg font-medium">{stats.totalUsers || 0}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Active Clients</div>
                <div className="text-lg font-medium">{stats.totalClients || 0}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
