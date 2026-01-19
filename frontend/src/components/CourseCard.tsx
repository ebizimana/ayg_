import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ProgressRing } from "@/components/ProgressRing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, TrendingUp, TrendingDown, Minus, Lock } from "lucide-react";

interface CourseCardProps {
  name: string;
  code: string;
  credits?: number;
  gradingMethod?: "WEIGHTED" | "POINTS";
  isDemo?: boolean;
  isCompleted?: boolean;
  isLocked?: boolean;
  currentGrade: number | null;
  letterGrade: string;
  targetLetter: string;
  pointsLeftToLose?: number | null;
  menuItems?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    icon?: React.ReactNode;
  }[];
  trend?: "up" | "down" | "stable";
  onClick?: () => void;
}

type RingColor = "success" | "warning" | "destructive" | "primary" | "amber";

function getGradeColor(grade: number): "success" | "warning" | "destructive" | "primary" {
  if (grade >= 90) return "success";
  if (grade >= 80) return "primary";
  if (grade >= 70) return "warning";
  return "destructive";
}

const letterStyles: Record<string, { textClass: string; ringColor: RingColor }> = {
  A: { textClass: "text-primary", ringColor: "primary" },
  B: { textClass: "text-success", ringColor: "success" },
  C: { textClass: "text-warning", ringColor: "warning" },
  D: { textClass: "text-amber-600", ringColor: "amber" },
  F: { textClass: "text-destructive", ringColor: "destructive" },
};

function getTrendIcon(trend?: "up" | "down" | "stable") {
  switch (trend) {
    case "up":
      return <TrendingUp className="h-4 w-4 text-success" />;
    case "down":
      return <TrendingDown className="h-4 w-4 text-destructive" />;
    default:
      return null;
  }
}

export function CourseCard({
  name,
  code,
  credits,
  gradingMethod,
  isDemo,
  isCompleted,
  isLocked,
  currentGrade,
  letterGrade,
  targetLetter,
  pointsLeftToLose,
  menuItems,
  trend,
  onClick,
}: CourseCardProps) {
  const displayGrade = currentGrade ?? 0;
  const gradeColor = getGradeColor(displayGrade);
  const normalizedLetter = letterGrade?.trim().toUpperCase()[0] ?? "";
  const letterStyle = letterGrade === "—" ? null : letterStyles[normalizedLetter] ?? null;
  const ringColor = letterStyle?.ringColor ?? gradeColor;
  const letterClass =
    letterGrade === "—" ? "text-muted-foreground" : letterStyle?.textClass ?? "text-foreground";
  const methodLabel = gradingMethod === "POINTS" ? "Points-based" : gradingMethod === "WEIGHTED" ? "Weighted" : "";
  const pointsLabel = pointsLeftToLose === null || pointsLeftToLose === undefined ? "—" : `${pointsLeftToLose} pts`;
  const pointsColor =
    pointsLeftToLose === null || pointsLeftToLose === undefined
      ? "text-muted-foreground"
      : pointsLeftToLose < 10
        ? "text-destructive"
        : pointsLeftToLose < 50
          ? "text-warning"
          : "text-success";

  return (
    <Card 
      className={`group cursor-pointer border-border/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
        isCompleted ? "bg-muted/30 opacity-80" : ""
      } ${isLocked ? "opacity-70" : ""}`}
      onClick={onClick}
    >
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            {code}
            {credits !== undefined && (
              <>
                <span className="mx-2 text-slate-300">•</span>
                <span>{credits} credits</span>
              </>
            )}
            {isDemo && (
              <Badge variant="secondary" className="ml-2">
                Demo
              </Badge>
            )}
            {isLocked && (
              <Badge variant="outline" className="ml-2 flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Locked
              </Badge>
            )}
            {isCompleted && (
              <Badge variant="outline" className="ml-2">
                Completed
              </Badge>
            )}
          </p>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground line-clamp-1">{name}</h3>
            {methodLabel && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-sm font-medium text-muted-foreground">{methodLabel}</span>
              </>
            )}
          </div>
        </div>
        {menuItems?.length ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity -mt-1 -mr-2"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {menuItems.map((item) => (
                <DropdownMenuItem
                  key={item.label}
                  disabled={item.disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    item.onClick();
                  }}
                >
                  {item.icon ? <span className="mr-2">{item.icon}</span> : null}
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex items-center justify-between gap-4">
          {letterGrade === "—" && currentGrade === null ? (
            <div className="text-sm text-muted-foreground">
              Add assignments and run the simulation to see your current grade.
            </div>
          ) : (
            <>
              <ProgressRing
                progress={displayGrade}
                size={90}
                strokeWidth={8}
                color={ringColor}
                showPercentage={true}
              />
              <div className="flex-1 space-y-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Current Letter Grade</p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-bold ${letterClass}`}>{letterGrade}</span>
                    {getTrendIcon(trend)}
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>Target Letter Grade</span>
                    <span className="font-semibold text-foreground">{targetLetter}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>Points left to lose</span>
                    <span className={`font-semibold ${pointsColor}`}>{pointsLabel}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
