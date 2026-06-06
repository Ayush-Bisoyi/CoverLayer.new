import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Shield, Zap, Building2, AlertCircle, TrendingUp, ArrowRight } from "lucide-react";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";

const mockVolumeData = [
  { month: "Jan", premium: 42000 },
  { month: "Feb", premium: 58000 },
  { month: "Mar", premium: 51000 },
  { month: "Apr", premium: 79000 },
  { month: "May", premium: 94000 },
  { month: "Jun", premium: 112000 },
];

export default function Dashboard() {
  const [partners, setPartners] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [claims, setClaims] = useState([]);
  const [riskEvents, setRiskEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Partner.list(),
      base44.entities.Policy.list("-created_date", 5),
      base44.entities.Claim.list("-created_date", 5),
      base44.entities.RiskEvent.list("-created_date", 20),
    ]).then(([p, pol, c, re]) => {
      setPartners(p);
      setPolicies(pol);
      setClaims(c);
      setRiskEvents(re);
      setLoading(false);
    });
  }, []);

  const activePartners = partners.filter(p => p.status === "active").length;
  const activePolicies = policies.filter(p => p.status === "active").length;
  const openClaims = claims.filter(c => ["submitted", "under_review"].includes(c.status)).length;
  const totalPremium = policies.reduce((s, p) => s + (p.premium_paid || 0), 0);
  const avgProcessingMs = riskEvents.length
    ? Math.round(riskEvents.reduce((s, e) => s + (e.processing_ms || 320), 0) / riskEvents.length)
    : 320;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Platform Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time insurance infrastructure metrics</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-400/10 border border-green-400/20 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400 font-mono font-medium">All Systems Operational</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Partners" value={loading ? "—" : activePartners} sub="Platform integrations" icon={Building2} trend="+3 this month" trendUp />
        <StatCard label="Premium Volume" value={loading ? "—" : `$${(totalPremium / 1000).toFixed(0)}K`} sub="Total premiums collected" icon={TrendingUp} trend="+18% MoM" trendUp accent />
        <StatCard label="Active Policies" value={loading ? "—" : activePolicies} sub="Across all partners" icon={Shield} />
        <StatCard label="Avg Risk Engine" value={loading ? "—" : `${avgProcessingMs}ms`} sub="Quote generation SLA" icon={Zap} trend="<500ms target" trendUp />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-foreground">Premium Volume</h3>
            <p className="text-xs text-muted-foreground">Monthly collected premiums (USD)</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={mockVolumeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="premGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v / 1000}K`} />
              <Tooltip
                contentStyle={{ background: "#0d1424", border: "1px solid #1e2d45", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#94a3b8" }}
                formatter={(v) => [`$${v.toLocaleString()}`, "Premium"]}
              />
              <Area type="monotone" dataKey="premium" stroke="#3B82F6" strokeWidth={2} fill="url(#premGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Recent Claims</h3>
            <Link to="/claims" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}</div>
          ) : claims.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No claims yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {claims.slice(0, 4).map(claim => (
                <div key={claim.id} className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{claim.claimant_name || claim.claimant_email}</p>
                    <p className="text-xs text-muted-foreground">${(claim.claim_amount || 0).toLocaleString()}</p>
                  </div>
                  <StatusBadge status={claim.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Recently Issued Policies</h3>
          <Link to="/policies" className="text-xs text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />)}</div>
        ) : policies.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No policies issued yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="pb-2.5 text-xs font-medium text-muted-foreground">Policy #</th>
                  <th className="pb-2.5 text-xs font-medium text-muted-foreground">Coverage</th>
                  <th className="pb-2.5 text-xs font-medium text-muted-foreground">User</th>
                  <th className="pb-2.5 text-xs font-medium text-muted-foreground">Premium</th>
                  <th className="pb-2.5 text-xs font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {policies.map(policy => (
                  <tr key={policy.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 font-mono text-xs text-muted-foreground">{policy.policy_number || policy.id.slice(0, 8)}</td>
                    <td className="py-2.5 text-foreground font-medium">{policy.policy_name}</td>
                    <td className="py-2.5 text-muted-foreground text-xs">{policy.end_user_email}</td>
                    <td className="py-2.5 font-mono text-foreground">${(policy.premium_paid || 0).toFixed(2)}</td>
                    <td className="py-2.5"><StatusBadge status={policy.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
