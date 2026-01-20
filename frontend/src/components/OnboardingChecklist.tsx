import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { getOnboardingStatus, setOnboardingHelpDone } from "@/lib/onboarding";

const ASSIGNMENT_TARGET = 5;

export function OnboardingChecklist() {
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [status, setStatus] = useState(getOnboardingStatus());

  useEffect(() => {
    const refresh = () => setStatus(getOnboardingStatus());
    window.addEventListener("ayg_onboarding_refresh", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("ayg_onboarding_refresh", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const assignmentsDone = status.assignmentCount >= ASSIGNMENT_TARGET;
  const allDone =
    status.yearDone &&
    status.semesterDone &&
    status.courseDone &&
    assignmentsDone &&
    status.helpDone &&
    status.profileNameDone &&
    status.profilePhotoDone &&
    status.themeDone;

  const items = useMemo(
    () => [
      { label: "Create a year", done: status.yearDone },
      { label: "Create a semester", done: status.semesterDone },
      { label: "Create a course", done: status.courseDone },
      {
        label: `Create ${ASSIGNMENT_TARGET} assignments`,
        done: assignmentsDone,
        detail: `${Math.min(status.assignmentCount, ASSIGNMENT_TARGET)}/${ASSIGNMENT_TARGET}`,
      },
      {
        label: "Update your profile name",
        done: status.profileNameDone,
        actionLabel: "Open",
        actionTo: "/profile",
      },
      {
        label: "Add a profile photo",
        done: status.profilePhotoDone,
        actionLabel: "Open",
        actionTo: "/profile",
      },
      {
        label: "Choose a theme",
        done: status.themeDone,
        actionLabel: "Open",
        actionTo: "/profile",
      },
      {
        label: "Open the help guide",
        done: status.helpDone,
        actionLabel: "Open",
        actionTo: "/docs",
        onAction: setOnboardingHelpDone,
      },
    ],
    [
      assignmentsDone,
      status.assignmentCount,
      status.courseDone,
      status.helpDone,
      status.profileNameDone,
      status.profilePhotoDone,
      status.themeDone,
      status.semesterDone,
      status.yearDone,
    ],
  );

  if (allDone || dismissed) return null;

  return (
    <Card className="fixed bottom-6 right-6 z-50 w-[280px] border-border bg-card shadow-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          Getting started
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCollapsed((prev) => !prev)}
          >
            {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {!collapsed ? (
        <div className="px-4 py-3 space-y-2 text-sm">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-2">
              <span className={item.done ? "text-muted-foreground line-through" : "text-foreground"}>
                {item.label}
              </span>
              {item.actionLabel ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  asChild
                >
                  <Link to={item.actionTo ?? "/"} onClick={item.onAction}>
                    {item.actionLabel}
                  </Link>
                </Button>
              ) : item.detail ? (
                <span className="text-xs text-muted-foreground">{item.detail}</span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
