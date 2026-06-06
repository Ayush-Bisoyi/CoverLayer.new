pages/RiskEngine.jsx
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, Play, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/PageHeader";

const EVENT_TYPES = ["gig_job_accepted", "ecommerce_checkout", "flight_booking", "loan_disbursement", "rental_listing", "freelance_contract", "cargo_shipment"];

export default function RiskEngine() {
  const [riskEvents, setRiskEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({
    event_type: "gig_job_accepted",
    user_context: "25-year-old gig worker, 3 months on platform, 4.8 star rating, accepting a delivery job worth $45 in urban area",
    transaction_value: 45,
    location: "New York, US"
  });

  useEffect(() => {
    base44.entities.RiskEvent.list("-created_date", 10).then(re => { setRiskEvents(re); setLoading(false); });
  }, []);

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    const startMs = Date.now();

    const llmResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an AI insurance risk assessment engine. Analyze this event and return a risk assessment.

Event Type: ${form.event_type}
User Context: ${form.user_context}
Transaction Value: $${form.transaction_value}
Location: ${form.location}

Return JSON with:
- risk_score: 0-100
- risk_summary: 2-sentence plain language risk summary
- recommended_policies: array of 2-3 objects with { coverage_type, policy_name, estimated_premium_usd, coverage_amount_usd, rationale }
- primary_risk_factors: array of 3 risk factors`,
      response_json_schema: {
        type: "object",
        properties: {
          risk_score: { type: "number" },
          risk_summary: { type: "string" },
          recommended_policies: { type: "array", items: { type: "object", properties: { coverage_type: { type: "string" }, policy_name: { type: "string" }, estimated_premium_usd: { type: "number" }, coverage_amount_usd: { type: "number" }, rationale: { type: "string" } } } },
          primary_risk_factors: { type: "array", items: { type: "string" } }
        }
      }
    });

    const processingMs = Date.now() - startMs;
    const savedEvent = await base44.entities.RiskEvent.create({
      partner_id: "demo", event_type: form.event_type, user_context: form.user_context,
      transaction_value: form.transaction_value, location: form.location,
      risk_score: llmResult.risk_score, matched_policies: llmResult.recommended_policies?.length || 0, processing_ms: processingMs
    });

    setRiskEvents(prev => [savedEvent, ...prev.slice(0, 9)]);
    setResult({ ...llmResult, processingMs });
    setRunning(false);
  };

  const getRiskColor = (score) => {
    if (score < 30) return "text-green-400";
    if (score < 60) return "text-yellow-400";
    if (score < 80) return "text-orange-400";
    return "text-red-400";
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Risk Engine" subtitle="AI-powered contextual risk scoring and policy matching" />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Event Context</h3>
            <span className="ml-auto font-mono text-xs text-muted-foreground">POST /v1/risk/quote</span>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Event Type</label>
            <Select value={form.event_type} onValueChange={v => setForm(f => ({...f, event_type: v}))}>
              <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                {EVENT_TYPES.map(v => <SelectItem key={v} value={v} className="text-foreground font-mono text-xs">{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">User & Transaction Context</label>
            <Textarea rows={4} className="bg-input border-border text-foreground text-sm resize-none" value={form.user_context} onChange={e => setForm(f => ({...f, user_context: e.target.value}))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Transaction Value ($)</label>
              <Input type="number" className="bg-input border-border text-foreground" value={form.transaction_value} onChange={e => setForm(f => ({...f, transaction_value: parseFloat(e.target.value)}))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Location</label>
              <Input placeholder="City, Country" className="bg-input border-border text-foreground" value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} />
            </div>
          </div>
          <Button onClick={handleRun} disabled={running} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            {running ? (<><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />Assessing Risk…</>) : (<><Play className="w-4 h-4" />Run Risk Assessment</>)}
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Assessment Result</h3>
            {result && <span className="ml-auto font-mono text-xs text-green-400 flex items-center gap-1"><Clock className="w-3 h-3" />{result.processingMs}ms</span>}
          </div>

          {!result && !running && (
            <div className="text-center py-12">
              <Zap className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Run an assessment to see AI risk scoring</p>
            </div>
          )}
          {running && <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted/40 rounded-xl animate-pulse" />)}</div>}
          {result && !running && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl border border-border">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Risk Score</p>
                  <p className={`text-3xl font-bold font-mono ${getRiskColor(result.risk_score)}`}>{result.risk_score}</p>
                </div>
                <div className="flex-1">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${result.risk_score < 30 ? "bg-green-400" : result.risk_score < 60 ? "bg-yellow-400" : "bg-red-400"}`} style={{ width: `${result.risk_score}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{result.risk_summary}</p>
                </div>
              </div>
              {result.primary_risk_factors?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Risk Factors</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.primary_risk_factors.map((f, i) => (
                      <span key={i} className="px-2 py-0.5 bg-yellow-400/10 border border-yellow-400/20 rounded-md text-xs text-yellow-400">{f}</span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Matched Policies ({result.recommended_policies?.length})</p>
                <div className="space-y-2">
                  {result.recommended_policies?.map((pol, i) => (
                    <div key={i} className="p-3 bg-muted/20 border border-border rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-foreground">{pol.policy_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{pol.rationale}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-mono text-primary font-bold">${pol.estimated_premium_usd}</p>
                          <p className="text-xs text-muted-foreground">${(pol.coverage_amount_usd / 1000).toFixed(0)}K coverage</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Recent Risk Events</h3>
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />)}</div>
        ) : riskEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No events yet — run your first assessment above</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="pb-2 text-xs font-medium text-muted-foreground">Event Type</th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground">Location</th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground">Risk Score</th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground">Matched</th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {riskEvents.map(event => (
                  <tr key={event.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 font-mono text-xs text-muted-foreground">{event.event_type}</td>
                    <td className="py-2.5 text-xs text-foreground">{event.location || "—"}</td>
                    <td className="py-2.5"><span className={`font-mono text-sm font-bold ${getRiskColor(event.risk_score)}`}>{event.risk_score || "—"}</span></td>
                    <td className="py-2.5 text-xs text-foreground">{event.matched_policies || 0} policies</td>
                    <td className="py-2.5 font-mono text-xs text-muted-foreground">{event.processing_ms ? `${event.processing_ms}ms` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}pages/RiskEngine.jsx
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, Play, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/PageHeader";

const EVENT_TYPES = ["gig_job_accepted", "ecommerce_checkout", "flight_booking", "loan_disbursement", "rental_listing", "freelance_contract", "cargo_shipment"];

export default function RiskEngine() {
  const [riskEvents, setRiskEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({
    event_type: "gig_job_accepted",
    user_context: "25-year-old gig worker, 3 months on platform, 4.8 star rating, accepting a delivery job worth $45 in urban area",
    transaction_value: 45,
    location: "New York, US"
  });

  useEffect(() => {
    base44.entities.RiskEvent.list("-created_date", 10).then(re => { setRiskEvents(re); setLoading(false); });
  }, []);

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    const startMs = Date.now();

    const llmResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an AI insurance risk assessment engine. Analyze this event and return a risk assessment.

Event Type: ${form.event_type}
User Context: ${form.user_context}
Transaction Value: $${form.transaction_value}
Location: ${form.location}

Return JSON with:
- risk_score: 0-100
- risk_summary: 2-sentence plain language risk summary
- recommended_policies: array of 2-3 objects with { coverage_type, policy_name, estimated_premium_usd, coverage_amount_usd, rationale }
- primary_risk_factors: array of 3 risk factors`,
      response_json_schema: {
        type: "object",
        properties: {
          risk_score: { type: "number" },
          risk_summary: { type: "string" },
          recommended_policies: { type: "array", items: { type: "object", properties: { coverage_type: { type: "string" }, policy_name: { type: "string" }, estimated_premium_usd: { type: "number" }, coverage_amount_usd: { type: "number" }, rationale: { type: "string" } } } },
          primary_risk_factors: { type: "array", items: { type: "string" } }
        }
      }
    });

    const processingMs = Date.now() - startMs;
    const savedEvent = await base44.entities.RiskEvent.create({
      partner_id: "demo", event_type: form.event_type, user_context: form.user_context,
      transaction_value: form.transaction_value, location: form.location,
      risk_score: llmResult.risk_score, matched_policies: llmResult.recommended_policies?.length || 0, processing_ms: processingMs
    });

    setRiskEvents(prev => [savedEvent, ...prev.slice(0, 9)]);
    setResult({ ...llmResult, processingMs });
    setRunning(false);
  };

  const getRiskColor = (score) => {
    if (score < 30) return "text-green-400";
    if (score < 60) return "text-yellow-400";
    if (score < 80) return "text-orange-400";
    return "text-red-400";
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Risk Engine" subtitle="AI-powered contextual risk scoring and policy matching" />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Event Context</h3>
            <span className="ml-auto font-mono text-xs text-muted-foreground">POST /v1/risk/quote</span>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Event Type</label>
            <Select value={form.event_type} onValueChange={v => setForm(f => ({...f, event_type: v}))}>
              <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                {EVENT_TYPES.map(v => <SelectItem key={v} value={v} className="text-foreground font-mono text-xs">{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">User & Transaction Context</label>
            <Textarea rows={4} className="bg-input border-border text-foreground text-sm resize-none" value={form.user_context} onChange={e => setForm(f => ({...f, user_context: e.target.value}))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Transaction Value ($)</label>
              <Input type="number" className="bg-input border-border text-foreground" value={form.transaction_value} onChange={e => setForm(f => ({...f, transaction_value: parseFloat(e.target.value)}))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Location</label>
              <Input placeholder="City, Country" className="bg-input border-border text-foreground" value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} />
            </div>
          </div>
          <Button onClick={handleRun} disabled={running} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            {running ? (<><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />Assessing Risk…</>) : (<><Play className="w-4 h-4" />Run Risk Assessment</>)}
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Assessment Result</h3>
            {result && <span className="ml-auto font-mono text-xs text-green-400 flex items-center gap-1"><Clock className="w-3 h-3" />{result.processingMs}ms</span>}
          </div>

          {!result && !running && (
            <div className="text-center py-12">
              <Zap className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Run an assessment to see AI risk scoring</p>
            </div>
          )}
          {running && <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted/40 rounded-xl animate-pulse" />)}</div>}
          {result && !running && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl border border-border">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Risk Score</p>
                  <p className={`text-3xl font-bold font-mono ${getRiskColor(result.risk_score)}`}>{result.risk_score}</p>
                </div>
                <div className="flex-1">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${result.risk_score < 30 ? "bg-green-400" : result.risk_score < 60 ? "bg-yellow-400" : "bg-red-400"}`} style={{ width: `${result.risk_score}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{result.risk_summary}</p>
                </div>
              </div>
              {result.primary_risk_factors?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Risk Factors</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.primary_risk_factors.map((f, i) => (
                      <span key={i} className="px-2 py-0.5 bg-yellow-400/10 border border-yellow-400/20 rounded-md text-xs text-yellow-400">{f}</span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Matched Policies ({result.recommended_policies?.length})</p>
                <div className="space-y-2">
                  {result.recommended_policies?.map((pol, i) => (
                    <div key={i} className="p-3 bg-muted/20 border border-border rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-foreground">{pol.policy_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{pol.rationale}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-mono text-primary font-bold">${pol.estimated_premium_usd}</p>
                          <p className="text-xs text-muted-foreground">${(pol.coverage_amount_usd / 1000).toFixed(0)}K coverage</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Recent Risk Events</h3>
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />)}</div>
        ) : riskEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No events yet — run your first assessment above</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="pb-2 text-xs font-medium text-muted-foreground">Event Type</th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground">Location</th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground">Risk Score</th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground">Matched</th>
                  <th className="pb-2 text-xs font-medium text-muted-foreground">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {riskEvents.map(event => (
                  <tr key={event.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 font-mono text-xs text-muted-foreground">{event.event_type}</td>
                    <td className="py-2.5 text-xs text-foreground">{event.location || "—"}</td>
                    <td className="py-2.5"><span className={`font-mono text-sm font-bold ${getRiskColor(event.risk_score)}`}>{event.risk_score || "—"}</span></td>
                    <td className="py-2.5 text-xs text-foreground">{event.matched_policies || 0} policies</td>
                    <td className="py-2.5 font-mono text-xs text-muted-foreground">{event.processing_ms ? `${event.processing_ms}ms` : "—"}</td>
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
