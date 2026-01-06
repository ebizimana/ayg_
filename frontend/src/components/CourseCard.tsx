import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ProgressRing } from "@/components/ProgressRing";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface CourseCardProps {
  name: string;
  code: string;
  currentGrade: number;
  targetGrade: number;
  credits: number;
  letterGrade: string;
  trend?: "up" | "down" | "stable";
  onClick?: () => void;
  onOptionsClick?: () => void;
}

function getGradeColor(grade: number): "success" | "warning" | "destructive" | "primary" {
  if (grade >= 90) return "success";
  if (grade >= 80) return "primary";
  if (grade >= 70) return "warning";
  return "destructive";
}

function getTrendIcon(trend?: "up" | "down" | "stable") {
  switch (trend) {
    case "up":
      return <TrendingUp className="h-4 w-4 text-success" />;
    case "down":
      return <TrendingDown className="h-4 w-4 text-destructive" />;
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
}

export function CourseCard({
  name,
  code,
  currentGrade,
  targetGrade,
  credits,
  letterGrade,
  trend,
  onClick,
  onOptionsClick,
}: CourseCardProps) {
  const isOnTrack = currentGrade >= targetGrade;
  const gradeColor = getGradeColor(currentGrade);

  return (
    <Card 
      className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50"
      onClick={onClick}
    >
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{code}</p>
          <h3 className="font-semibold text-foreground line-clamp-1">{name}</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 transition-opacity -mt-1 -mr-2"
          onClick={(e) => {
            e.stopPropagation();
            onOptionsClick?.();
          }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex items-center justify-between gap-4">
          <ProgressRing
            progress={currentGrade}
            size={80}
            strokeWidth={8}
            color={gradeColor}
            showPercentage={false}
          />
          <div className="flex-1 space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">{letterGrade}</span>
              <span className="text-lg text-muted-foreground">{currentGrade.toFixed(1)}%</span>
              {getTrendIcon(trend)}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className={isOnTrack ? "text-success" : "text-warning"}>
                {isOnTrack ? "On track" : `Need ${(targetGrade - currentGrade).toFixed(1)}% more`}
              </span>
              <span className="text-muted-foreground">• {credits} credits</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
