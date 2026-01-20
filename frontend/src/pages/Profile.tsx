import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile, type UserTier } from "@/hooks/use-user-profile";
import { http } from "@/lib/http";
import { getProfileInitials, getProfilePhoto } from "@/lib/profile";
import { GraduationCap, MoreVertical } from "lucide-react";
import { useTheme } from "next-themes";
import { setOnboardingProfileNameDone, setOnboardingProfilePhotoDone, setOnboardingThemeDone } from "@/lib/onboarding";

const tabs = ["Profile", "Subscription"] as const;
type Tab = (typeof tabs)[number];

export default function Profile() {
  const { toast } = useToast();
  const nav = useNavigate();
  const { profile, refresh, setProfile } = useUserProfile();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("Subscription");
  const [loadingTier, setLoadingTier] = useState(false);
  const [name, setName] = useState(localStorage.getItem("ayg_display_name") ?? "");
  const [editName, setEditName] = useState(name);
  const [profilePhoto, setProfilePhoto] = useState(getProfilePhoto());
  const [editPhoto, setEditPhoto] = useState(profilePhoto);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
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
  const initials = getProfileInitials(name || profile?.email || "");

  const openNameDialog = () => {
    setEditName(name);
    setEditPhoto(profilePhoto);
    setNameDialogOpen(true);
  };

  const saveName = () => {
    const trimmed = editName.trim();
    setName(trimmed);
    localStorage.setItem("ayg_display_name", trimmed);
    setProfilePhoto(editPhoto);
    if (editPhoto) {
      localStorage.setItem("ayg_profile_photo", editPhoto);
    } else {
      localStorage.removeItem("ayg_profile_photo");
    }
    if (trimmed) setOnboardingProfileNameDone();
    if (editPhoto) setOnboardingProfilePhotoDone();
    setNameDialogOpen(false);
    toast({ title: "Name updated", description: "Your profile name has been saved." });
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await http("/users/me", { method: "DELETE" });
      localStorage.clear();
      nav("/auth?mode=login");
    } catch (err) {
      toast({
        title: "Failed to delete account",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeleteConfirm("");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link to="/academic-year" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">AY Grade</span>
          </Link>
          <Button variant="outline" asChild>
            <Link to="/academic-year">Back to Dashboard</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 md:grid-cols-[220px,1fr]">
          <Card className="h-fit border-border">
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
            <Card className="border-border">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Account details</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={openNameDialog}>Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-foreground">
                <div className="flex items-center gap-3">
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt={name || "Profile"}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {initials}
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="font-semibold">{name || "—"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-semibold">{profile?.email ?? localStorage.getItem("ayg_email") ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Current plan</p>
                  <Badge variant="secondary">{tier}</Badge>
                </div>
                <Separator />
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Appearance</p>
                    <p className="text-sm font-semibold text-foreground">Choose a theme</p>
                  </div>
                  <RadioGroup
                    value={theme ?? "system"}
                    onValueChange={(value) => {
                      setTheme(value);
                      setOnboardingThemeDone();
                    }}
                    className="grid gap-3 sm:grid-cols-3"
                  >
                    {["light", "dark", "system"].map((value) => (
                      <label
                        key={value}
                        className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-border/80"
                      >
                        <RadioGroupItem value={value} />
                        {value === "light" ? "Light" : value === "dark" ? "Dark" : "System"}
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border">
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
                  <div className="rounded-lg border border-border p-4">
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
                      <Card className={`border ${tier === "FREE" ? "border-primary" : "border-border"}`}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Free</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-foreground">
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

                      <Card className={`border ${tier === "PAID" ? "border-primary" : "border-border"}`}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Paid</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-foreground">
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

      <Dialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit your name</DialogTitle>
            <DialogDescription>This name appears in your profile details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="profile-name">Name</Label>
            <Input
              id="profile-name"
              placeholder="Enter your name"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-photo">Profile photo</Label>
            <Input
              id="profile-photo"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  setEditPhoto("");
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === "string") {
                    setEditPhoto(reader.result);
                  }
                };
                reader.readAsDataURL(file);
              }}
            />
            {editPhoto ? (
              <div className="flex items-center gap-3">
                <img
                  src={editPhoto}
                  alt="Profile preview"
                  className="h-14 w-14 rounded-full object-cover"
                />
                <Button variant="ghost" size="sm" onClick={() => setEditPhoto("")}>
                  Remove photo
                </Button>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveName} disabled={!editName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your account and all associated data. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
            <Input
              id="delete-confirm"
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              placeholder="DELETE"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
              disabled={deleting || deleteConfirm.trim() !== "DELETE"}
            >
              {deleting ? "Deleting..." : "Delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
