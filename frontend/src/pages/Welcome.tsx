import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ProgressRing";
import {
  GraduationCap,
  Target,
  TrendingUp,
  Calculator,
  ChevronRight,
  CheckCircle,
  Sparkles,
  BarChart3,
} from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Goal-Driven Tracking",
    description:
      "Set your target grade and see exactly what you need on each assignment to achieve it.",
  },
  {
    icon: Calculator,
    title: "Smart Calculations",
    description:
      "Automatically calculates weighted grades, drop-lowest rules, and extra credit.",
  },
  {
    icon: TrendingUp,
    title: "GPA Projections",
    description:
      "See how each course affects your semester and cumulative GPA in real-time.",
  },
  {
    icon: BarChart3,
    title: "What-If Scenarios",
    description:
      'Ask "What if I get an 85 on the final?" and see exactly how it impacts your grade.',
  },
];

const benefits = [
  "Know exactly what scores you need",
  "Track points left to lose",
  "Weighted grade calculations",
  "Semester and cumulative GPA",
  "Extra credit support",
  "Drop-lowest tracking",
];

export default function Welcome() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">AYG</span>
            </Link>
            <div className="flex items-center gap-3">
              <Button variant="ghost" asChild>
                <Link to="/auth?mode=login">Log in</Link>
              </Button>
              <Button variant="hero" asChild>
                <Link to="/auth?mode=register">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                Grade Intelligence for Students
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight">
                Achieve Your
                <span className="text-gradient block">Dream Grade</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-xl">
                Stop guessing. Know exactly what scores you need on every assignment
                to hit your target grade. AYG turns grade tracking into grade
                <em> achieving</em>.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="xl" variant="hero" asChild>
                  <Link to="/auth?mode=register">
                    Start for Free
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button size="xl" variant="outline" asChild>
                  <Link to="/auth?mode=login">I have an account</Link>
                </Button>
              </div>
            </div>

            {/* Hero Visual */}
            <div
              className="relative opacity-0 animate-fade-in-up"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-3xl" />
              <div className="relative bg-card rounded-2xl border border-border/50 shadow-xl p-8">
                <div className="flex items-center gap-4 mb-6">
                  <ProgressRing progress={87} size={100} color="success" label="Current" />
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">CS 301 - Data Structures</p>
                    <p className="text-2xl font-bold text-foreground">B+ → A-</p>
                    <p className="text-sm text-success font-medium">
                      Need 91% avg on remaining work
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Target Grade</span>
                    <span className="font-semibold text-foreground">A (90%)</span>
                  </div>
                  <div className="h-3 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-gradient-primary rounded-full transition-all duration-500"
                      style={{ width: "87%" }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Points to spare</span>
                    <span className="font-semibold text-warning">23 pts remaining</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Strip */}
      <section className="py-8 bg-primary/5 border-y border-border/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-2 text-foreground">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Grade Intelligence, Not Just Tracking
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              AYG answers the question every student asks: "What do I need to get?"
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl bg-card border border-border/50 hover:shadow-lg hover:border-primary/20 transition-all duration-300 opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${0.1 + index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-12 text-center">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
            <div className="relative space-y-6">
              <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground">
                Ready to Achieve Your Grade?
              </h2>
              <p className="text-lg text-primary-foreground/80 max-w-xl mx-auto">
                Join students who stopped stressing and started strategizing.
              </p>
              <Button
                size="xl"
                variant="secondary"
                className="bg-background text-foreground hover:bg-background/90"
                asChild
              >
                <Link to="/auth?mode=register">
                  Create Free Account
                  <ChevronRight className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">AYG</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Achieve Your Grade. Built for students, by students.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
