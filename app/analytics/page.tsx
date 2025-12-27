"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, Users, FileText, Zap, Info } from "lucide-react";
import Header from '@/components/Header';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface AnalyticsData {
  basicAdoptionRate: number;
  activeUserRate: number;
  featureStickiness: number;
  totalDocuments: number;
  totalMcpQueries: number;
  totalUsers: number;
  activeUsers: number;
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  trends: {
    adoption: number[];
    active: number[];
    stickiness: number[];
    documents: number[];
    mcpQueries: number[];
    dates: string[];
  };
}

interface Organization {
  id: number;
  name: string;
  slug: string;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>('all');
  const [timePeriod, setTimePeriod] = useState<string>('30-day');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrganizations();
    fetchAnalyticsData();
  }, [selectedOrg, timePeriod]);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/admin/organizations');
      if (response.ok) {
        const orgData = await response.json();
        console.log('Organizations fetched:', orgData.organizations);
        setOrganizations(orgData.organizations || []);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to fetch organizations:', response.status, errorData);
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    }
  };

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        organization: selectedOrg,
        period: timePeriod
      });
      
      const response = await fetch(`/api/analytics?${params}`);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to fetch analytics data:', response.status, errorData);
        // Show user-friendly error message
        if (response.status === 401) {
          console.error('Authentication required - please log in as SuperAdmin');
        } else if (response.status === 403) {
          console.error('Access denied - SuperAdmin role required');
        }
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateRange = () => {
    const today = new Date();
    const days = timePeriod === '30-day' ? 30 : 90;
    const startDate = new Date(today.getTime() - (days * 24 * 60 * 60 * 1000));
    
    return `📅 Data for: Last ${days} Days (${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
        <Header />
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center relative mx-auto mb-4">
                  <div className="w-5 h-5 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/60"></div>
                </div>
                <p className="text-muted-foreground">Loading analytics...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <Header />
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">Sol Analytics Dashboard</h1>
            <Badge variant="secondary" className="ml-2">SuperAdmin</Badge>
          </div>
          <p className="text-muted-foreground text-lg">Monitor research platform usage across your organization</p>
        </div>

        {/* Date Range Display */}
        <div className="bg-muted/50 rounded-lg p-4 mb-6 text-center">
          <span className="text-sm text-muted-foreground">{formatDateRange()}</span>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Organization</label>
                <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Organizations</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.slug}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Time Period</label>
                <Select value={timePeriod} onValueChange={setTimePeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30-day">Last 30 Days</SelectItem>
                    <SelectItem value="90-day">Last 90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button onClick={fetchAnalyticsData} variant="outline" className="w-full">
                  Refresh Data
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Grid */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Basic Adoption Rate */}
            <Card className="relative group cursor-help">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Basic Adoption Rate
                  </CardTitle>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground mb-2">
                  {data.basicAdoptionRate.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground mb-3">
                  {data.activeUsers.toLocaleString()} of {data.totalUsers.toLocaleString()} users
                </div>
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  Users who have uploaded at least one document
                </div>
              </CardContent>
            </Card>

            {/* Active User Rate */}
            <Card className="relative group cursor-help">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Active User Rate (30-day)
                  </CardTitle>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground mb-2">
                  {data.activeUserRate.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground mb-3">
                  {data.monthlyActiveUsers.toLocaleString()} of {data.totalUsers.toLocaleString()} users
                </div>
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  Users with 3+ document interactions
                </div>
              </CardContent>
            </Card>

            {/* Feature Stickiness */}
            <Card className="relative group cursor-help">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Feature Stickiness (DAU/MAU)
                  </CardTitle>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground mb-2">
                  {data.featureStickiness.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground mb-3">
                  {data.dailyActiveUsers.toLocaleString()} / {data.monthlyActiveUsers.toLocaleString()} users
                </div>
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  Daily active users / Monthly active users
                </div>
              </CardContent>
            </Card>

            {/* Document Uploads */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Document Uploads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground mb-2">
                  {data.totalDocuments.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total documents uploaded
                </div>
              </CardContent>
            </Card>

            {/* MCP Queries */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  MCP Queries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground mb-2">
                  {data.totalMcpQueries.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  AI agent queries processed
                </div>
              </CardContent>
            </Card>

            {/* Total Users */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground mb-2">
                  {data.totalUsers.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  Licensed users across all orgs
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Insights */}
        {data && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Quick Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">
                    {data.basicAdoptionRate > 30 ? 'Strong' : 'Growing'} adoption rate - 
                    {data.basicAdoptionRate > 30 ? ' above industry benchmark' : ' focus on user onboarding'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">
                    {data.featureStickiness > 20 ? 'High' : 'Moderate'} stickiness - 
                    users are {data.featureStickiness > 20 ? 'forming daily habits' : 'still exploring the platform'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm">
                    {data.totalMcpQueries > 0 ? `${data.totalMcpQueries.toLocaleString()} AI queries` : 'No AI queries yet'} - 
                    {data.totalMcpQueries > 0 ? ' strong AI integration usage' : ' AI features ready for adoption'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Interactive Charts */}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Adoption Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📈 Adoption Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <Line
                  data={{
                    labels: data.trends.dates,
                    datasets: [
                      {
                        label: 'Basic Adoption Rate (%)',
                        data: data.trends.adoption,
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                      },
                      {
                        label: 'Active User Rate (%)',
                        data: data.trends.active,
                        borderColor: 'rgb(16, 185, 129)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top' as const,
                      },
                      title: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                          callback: function(value) {
                            return value + '%';
                          }
                        }
                      },
                    },
                  }}
                  height={300}
                />
              </CardContent>
            </Card>

            {/* Activity Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📊 Activity Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <Line
                  data={{
                    labels: data.trends.dates,
                    datasets: [
                      {
                        label: 'Document Uploads',
                        data: data.trends.documents,
                        borderColor: 'rgb(168, 85, 247)',
                        backgroundColor: 'rgba(168, 85, 247, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y',
                      },
                      {
                        label: 'MCP Queries',
                        data: data.trends.mcpQueries,
                        borderColor: 'rgb(245, 158, 11)',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y1',
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top' as const,
                      },
                      title: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        type: 'linear' as const,
                        display: true,
                        position: 'left' as const,
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Documents'
                        }
                      },
                      y1: {
                        type: 'linear' as const,
                        display: true,
                        position: 'right' as const,
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'MCP Queries'
                        },
                        grid: {
                          drawOnChartArea: false,
                        },
                      },
                    },
                  }}
                  height={300}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Educational Content */}
        <Card>
          <CardHeader>
            <CardTitle>📊 Understanding Sol Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-green-600">✓ Why These Metrics Matter</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• <strong>Basic Adoption Rate:</strong> Shows how many users are willing to try Sol</li>
                  <li>• <strong>Active User Rate:</strong> Measures meaningful engagement beyond first upload</li>
                  <li>• <strong>Feature Stickiness:</strong> Indicates how essential Sol becomes to daily work</li>
                  <li>• <strong>Document Uploads:</strong> Raw productivity indicator</li>
                  <li>• <strong>MCP Queries:</strong> AI integration adoption and value</li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="font-semibold text-blue-600">📈 Industry Benchmarks</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• <strong>Adoption Rate:</strong> 30-50% within first quarter</li>
                  <li>• <strong>Active Rate:</strong> 20-30% of total users</li>
                  <li>• <strong>Stickiness:</strong> 15-25% for B2B research tools</li>
                  <li>• <strong>AI Usage:</strong> 10-20% of active users try AI features</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
