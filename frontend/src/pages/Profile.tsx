import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile, type UserTier } from "@/hooks/use-user-profile";
import { http } from "@/lib/http";
import { GraduationCap } from "lucide-react";

const tabs = ["Profile", "Subscription"] as const;
type Tab = (typeof tabs)[number];

export default function Profile() {
  const { toast } = useToast();
  const { profile, refresh, setProfile } = useUserProfile();
  const [activeTab, setActiveTab] = useState<Tab>("Subscription");
  const [loadingTier, setLoadingTier] = useState(false);
  const pricingTableId = import.meta.env.VITE_STRIPE_PRICING_TABLE_ID as string | undefined;
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
  const stripeReady = Boolean(pricingTableId && publishableKey);

  useEffect(() => {
    if (!stripeReady) return;
    const existing = document.querySelector('script[src="https://js.stripe.com/v3/pricing-table.js"]');
    if (existing) return;
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/pricing-table.js";
    script.async = true;
    document.body.appendChild(script);
  }, [stripeReady]);

  const setTier = async (tier: UserTier) => {
    setLoadingTier(true);
    try {
      const updated = await http<{ id: string; email: string; tier: UserTier }>("/users/me/tier", {
        method: "PATCH",
        body: JSON.stringify({ tier }),
      });
      setProfile((prev) => (prev ? { ...prev, tier: updated.tier } : prev));
      localStorage.setItem("ayg_tier", updated.tier);
      await refresh();
      toast({ title: "Subscription updated", description: `Plan set to ${updated.tier}.` });
    } catch (err) {
      toast({
        title: "Failed to update subscription",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingTier(false);
    }
  };

  const tier = profile?.tier ?? "FREE";
  const usage = profile?.usage;
  const limits = profile?.limits;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">AYG</span>
          </Link>
          <Button variant="outline" asChild>
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 md:grid-cols-[220px,1fr]">
          <Card className="h-fit border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tabs.map((tab) => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </Button>
              ))}
            </CardContent>
          </Card>

          {activeTab === "Profile" ? (
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Account details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-700">
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-semibold">{profile?.email ?? localStorage.getItem("ayg_email") ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Current plan</p>
                  <Badge variant="secondary">{tier}</Badge>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Subscription</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="secondary">{tier}</Badge>
                  {usage ? (
                    <p className="text-xs text-muted-foreground">
                      Usage: Years {usage.years} • Semesters {usage.semesters} • Courses {usage.courses}
                    </p>
                  ) : null}
                  {limits ? (
                    <p className="text-xs text-muted-foreground">
                      Limits: Years {limits.years ?? "Unlimited"} • Semesters {limits.semesters ?? "Unlimited"} • Courses{" "}
                      {limits.courses ?? "Unlimited"}
                    </p>
                  ) : null}
                </div>

                {stripeReady ? (
                  <div className="rounded-lg border border-slate-200 p-4">
                    <stripe-pricing-table
                      pricing-table-id={pricingTableId}
                      publishable-key={publishableKey}
                      client-reference-id={profile?.id ?? ""}
                      customer-email={profile?.email ?? localStorage.getItem("ayg_email") ?? ""}
                    />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card className={`border ${tier === "FREE" ? "border-primary" : "border-slate-200"}`}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Free</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-slate-700">
                          <ul className="list-disc list-inside text-xs text-muted-foreground">
                            <li>1 year, 1 semester, 3 courses</li>
                            <li>Assignments fully available</li>
                            <li>No deletions on years/semesters/courses</li>
                          </ul>
                          <Button
                            variant={tier === "FREE" ? "secondary" : "outline"}
                            className="w-full"
                            onClick={() => setTier("FREE")}
                            disabled={loadingTier || tier === "FREE"}
                          >
                            {tier === "FREE" ? "Current plan" : "Switch to Free"}
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className={`border ${tier === "PAID" ? "border-primary" : "border-slate-200"}`}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Paid</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-slate-700">
                          <ul className="list-disc list-inside text-xs text-muted-foreground">
                            <li>Unlimited years, semesters, and courses</li>
                            <li>All create, edit, delete actions</li>
                            <li>Priority feature access</li>
                          </ul>
                          <Button
                            className="w-full"
                            onClick={() => setTier("PAID")}
                            disabled={loadingTier || tier === "PAID"}
                          >
                            {tier === "PAID" ? "Current plan" : "Switch to Paid"}
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Stripe pricing table keys are not configured yet. Add `VITE_STRIPE_PUBLISHABLE_KEY` and
                      `VITE_STRIPE_PRICING_TABLE_ID` to enable checkout.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
