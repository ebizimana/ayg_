import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap } from "lucide-react";

const sections = [
  "Overview",
  "Getting Started",
  "Academic Years",
  "Semesters",
  "Courses",
  "Assignments & Categories",
  "Target GPA",
  "Simulations",
  "Tiers & Limits",
  "Data & Privacy",
] as const;

type DocSection = (typeof sections)[number];

type DocStep = {
  title: string;
  body: string;
  bullets?: string[];
  groups?: { title: string; items: string[] }[];
  note?: string;
};

type DocContent = {
  title: string;
  intro: string;
  bullets?: string[];
  steps?: DocStep[];
  note?: string;
};

const content: Record<DocSection, DocContent> = {
  Overview: {
    title: "What AY Grade Does",
    intro:
      "AY Grade helps students plan, track, and predict academic performance with clarity and control.",
    bullets: [
      "Plan courses with intent by setting a desired letter grade and seeing what is required to reach it.",
      "Track assignments at a granular level with weights, scores, and impact on the final grade.",
      "Predict grades in real time as scores are entered: current standing, final letter grade, and semester GPA.",
      "Make informed decisions by seeing how each score affects your target and what you need next.",
    ],
  },
  "Getting Started": {
    title: "Getting started",
    intro:
      "Getting started with AY Grade is designed to be simple, intentional, and fast so you can begin gaining clarity on your academic performance from day one.",
    steps: [
      {
        title: "Create an Academic Year",
        body:
          "Start by creating your Academic Year. This represents the full school year (for example, 2025-2026) and acts as the top-level container for all your semesters, courses, and grades. Organizing your data by academic year helps keep your progress clean, structured, and easy to review over time.",
      },
      {
        title: "Add a Semester",
        body:
          "Within your Academic Year, create a Semester (such as Fall 2025 or Spring 2026). Each semester tracks its own GPA and course load independently, allowing you to clearly see how your performance evolves from term to term.",
      },
      {
        title: "Add Your First Course",
        body:
          "Next, add your Course. For each course, you can set credits, define your desired letter grade, and apply the course grading scale. Once your course is created, AY Grade immediately begins calculating what performance is required across assignments to reach your academic goal.",
        bullets: ["Set the number of credits.", "Define your desired letter grade.", "Apply the course grading scale."],
      },
      {
        title: "Choose Your Grading Method and Add Coursework",
        body:
          "AY Grade supports both major grading systems used by schools, giving you flexibility to match your syllabus exactly.",
        bullets: [
          "Weighted categories: use this method if your syllabus defines categories with fixed weights (Exams 40%, Homework 25%, Projects 20%, Quizzes 15%). Create categories, assign weights, and add assignments under each category.",
          "Point-based: use this method if your course is graded by total points (for example, 1,000 points for the semester). Add assignments with point values and track points earned versus possible.",
          "You can choose the grading method per course, ensuring accuracy across different classes even within the same semester.",
        ],
      },
      {
        title: "Track, Adjust, and Simulate",
        body:
          "With your structure in place, AY Grade becomes a live academic dashboard. As you enter scores, the system updates your current course standing, predicts your final letter grade and GPA, and simulates what-if scenarios for future assignments. This helps you adjust study effort, time allocation, or expectations before outcomes are locked in.",
      },
    ],
    note:
      "Tip: Setting up your grading method correctly at the start ensures precise predictions and makes AY Grade dramatically more powerful throughout the semester.",
  },
  "Academic Years": {
    title: "Academic Years",
    intro:
      "Academic Years are the highest level of organization in AY Grade. They group multiple semesters together and provide a clear structure for long-term GPA planning and academic tracking. An Academic Year typically represents a full school year (such as 2025-2026) or a defined program phase. By separating your data into Academic Years, AY Grade ensures your progress remains organized, accurate, and easy to review over time.",
    steps: [
      {
        title: "Why Academic Years Matter",
        body:
          "Using Academic Years allows you to:",
        bullets: [
          "Organize semesters under a single school year or program",
          "Track GPA trends across multiple semesters",
          "Review past academic performance without clutter",
          "Plan long-term goals such as honors, scholarships, or program requirements",
        ],
      },
      {
        title: "How to Use Academic Years",
        body:
          "This structure gives you a big-picture view of your academic journey while still allowing detailed tracking at the semester, course, and assignment levels.",
        bullets: [
          "Create one Academic Year for each school year or academic cycle",
          "Add multiple semesters under the same Academic Year",
          "Use separate Academic Years for different institutions or program phases if needed",
        ],
      },
    ],
    note:
      "Tip: Keeping each school year or program phase in its own Academic Year helps maintain clean GPA calculations and makes year-to-year progress easy to compare.",
  },
  Semesters: {
    title: "Semesters",
    intro:
      "Semesters live inside an Academic Year and represent a single academic term, such as Fall, Spring, or Summer. Each semester acts as a self-contained unit for tracking courses, grades, and GPA. AY Grade treats every semester independently, ensuring that your academic performance is measured accurately and without overlap.",
    steps: [
      {
        title: "What Semesters Track",
        body: "Each semester allows you to:",
        bullets: [
          "Add and manage all courses taken during that term",
          "Track your semester GPA in real time",
          "Monitor total course load and credit distribution",
          "See how individual courses contribute to overall performance",
        ],
      },
      {
        title: "Why Semesters Matter",
        body: "Using semesters helps you:",
        bullets: [
          "Compare performance across different terms",
          "Identify academic trends (improvement, consistency, or risk)",
          "Plan future semesters based on past results",
          "Maintain clean GPA calculations without mixing terms",
        ],
      },
      {
        title: "Best Practices",
        body: "Practical guidelines for consistent tracking:",
        bullets: [
          "Create one semester per academic term",
          "Keep summer or short sessions as separate semesters",
          "Review completed semesters to inform future academic goals",
        ],
      },
    ],
    note:
      "By structuring your data by semester, AY Grade gives you both precision at the term level and clarity across your academic timeline.",
  },
  Courses: {
    title: "Courses",
    intro:
      "Courses live inside a Semester and represent each class you are taking during that term. A course is where grading rules, goals, and assignments come together to power AY Grade’s predictions and simulations. Each course in AY Grade is configured independently to match your syllabus as closely as possible.",
    steps: [
      {
        title: "What Courses Contain",
        body: "Each course includes:",
        bullets: [
          "Credits, used for GPA calculation",
          "A grading method (weighted categories or point-based)",
          "A target letter grade, which defines your academic goal",
          "All related categories and assignments",
        ],
      },
      {
        title: "Prediction accuracy",
        body: "AY Grade uses your selected grading method to:",
        bullets: [
          "Calculate assignment impact correctly",
          "Simulate future outcomes",
          "Keep GPA predictions reliable",
        ],
      },
      {
        title: "Target Grades and Simulations",
        body:
          "Your target grade is more than a preference—it drives AY Grade’s intelligence. Based on your target grade, AY Grade can:",
        bullets: [
          "Show what scores are needed on upcoming assignments",
          "Simulate best-case and worst-case scenarios",
          "Help you decide where effort matters most",
        ],
      },
      {
        title: "Best Practices",
        body: "Practical guidelines for consistent tracking:",
        bullets: [
          "Set your target grade at the start of the semester",
          "Match the grading method exactly to your syllabus",
          "Review course predictions regularly as new grades are added",
        ],
      },
    ],
    note:
      "Courses are where AY Grade becomes actionable—turning raw scores into clear academic direction.",
  },
  "Assignments & Categories": {
    title: "Assignments",
    intro:
      "Assignments are the most detailed level of tracking in AY Grade. They represent every quiz, homework, lab, project, and exam that contributes to your final course grade. By tracking grades at the assignment level, AY Grade shows the true impact of each score on your academic outcome.",
    steps: [
      {
        title: "Assignments",
        body: "Assignment details and live grade impact are tracked in real time.",
        groups: [
          {
            title: "Each assignment includes",
            items: [
              "A name and due date",
              "A score (percentage or points earned)",
              "A maximum value (for points-based courses)",
              "Automatic impact calculation on your course grade",
            ],
          },
          {
            title: "As assignments are added and graded, AY Grade continuously updates your",
            items: [
              "Current course standing",
              "Predicted final grade",
              "GPA projections",
            ],
          },
        ],
      },
      {
        title: "Categories (Weighted Courses Only)",
        body:
          "For weighted-category courses, assignments are grouped into categories such as Homework, Quizzes, Labs, Projects, or Exams. This allows AY Grade to model exactly how your syllabus distributes grading weight and to show where performance matters most.",
        groups: [
          {
            title: "Each category",
            items: [
              "Has a fixed percentage weight",
              "Calculates its own average based on assignments within it",
              "Contributes proportionally to the final course grade",
            ],
          },
        ],
      },
      {
        title: "Point-Based Assignments",
        body:
          "For point-based courses, assignments are tracked individually without categories. This method is ideal for courses that accumulate points evenly throughout the term.",
        bullets: [
          "Each assignment has a defined point value",
          "Grades are calculated as total points earned vs. total points possible",
          "Predictions update dynamically as new points are added",
        ],
      },
      {
        title: "Why Assignment-Level Tracking Matters",
        body: "Tracking assignments individually allows AY Grade to:",
        bullets: [
          "Show the real impact of a single score",
          "Simulate future outcomes accurately",
          "Identify high-impact assignments early",
          "Help prioritize effort where it yields the biggest return",
        ],
      },
      {
        title: "Best Practices",
        body: "Practical guidelines for reliable tracking:",
        bullets: [
          "Add assignments as soon as they appear on your syllabus",
          "Keep weights and point values accurate",
          "Enter grades promptly to maintain reliable predictions",
        ],
      },
    ],
    note:
      "Assignments and categories are where AY Grade turns raw data into clear, actionable insight—helping you stay in control of your academic performance at every step.",
  },
  "Target GPA": {
    title: "Target GPA",
    intro:
      "Target GPA allows you to define a clear academic goal and let AY Grade align your grade targets automatically across your academic structure. Instead of managing goals course by course, Target GPA provides a top-down objective that guides planning and predictions.",

    steps: [
      {
        title: "How Target GPA Works",
        body: "When you set a Target GPA, AY Grade:",
        groups: [
          {
            title: " Key functions",
            items: [
              "Translates your GPA goal into course-level target grades",
              "Adjusts predictions and simulations to reflect that goal",
              "Helps you understand what performance is required to stay on track",
            ],
          },
          {
            title: " Dynamic recalculation",
            items: ["Targets are recalculated dynamically as new grades are entered, keeping your projections accurate throughout the semester."],

          }
        ]
      },

      {
        title: "Scope of Target GPA",
        body:
          "Target GPA can be applied at different levels, depending on your planning needs:",
        groups: [
          {
            title: "Scopes",
            items: [
              "Career GPA – A long-term goal across your entire academic journey",
              "Academic Year GPA – A focused goal for a specific school year",
              "Semester GPA – A short-term target for an individual term",
            ],
          },
          {
            title: "Independent scopes",
            items: ["Each scope operates independently, allowing you to plan both short-term performance and long-term outcomes."],
          }
        ]
      },
      {
        title: "Dynamic Target Updates",
        body: "As your grades change, AY Grade automatically:",
        groups: [{
          title: "Updates",
          items: [
            "Updates required performance for remaining courses",
            "Reflects progress toward your GPA goal",
            "Highlights when adjustments are needed",
          ],
        },
        {
          title: "Realistic alignment",
          items: [
            "This ensures your targets remain realistic, actionable, and aligned with your academic reality.",
          ],
        }
        ],
      },
      {
        title: "Best Practices",
        body: "Practical guidelines for consistent planning:",
        bullets: [
          "Set your Target GPA early for maximum impact",
          "Use Semester targets for immediate planning",
          "Review Career targets when making long-term academic decisions",
        ],
      },
    ],
    note:
      "Target GPA transforms AY Grade from a tracking tool into a goal-driven academic planning system—helping you move with intention, not guesswork.",
  },
  Simulations: {
    title: "Simulations",
    intro:
      "Simulations allow you to explore academic outcomes before they happen. Instead of waiting for grades to be finalized, AY Grade lets you test scenarios, evaluate risk, and make informed decisions while there is still time to adjust. Simulations are powered by your course setup, grading method, assignments, and target grades.",
    steps: [
      {
        title: "What Simulations Show",
        body: "Using simulations, AY Grade can:",
        groups: [
          {
            title: "",
            items: [
              "Predict your final course grade based on current and future scores",
              "Calculate required scores on upcoming assignments to reach your target",
              "Show best-case, expected, and worst-case outcomes",
              "Update projections instantly as assumptions change",
            ],
          },
        ],
        note:
          "This gives you clarity on what matters most and where effort will have the biggest impact.",
      },
      {
        title: "Assignment-Level Forecasting",
        body: "For each upcoming assignment, AY Grade can:",
        groups: [
          {
            title: "",
            items: [
              "Show the minimum score needed to stay on target",
              "Highlight high-impact assignments that significantly affect your grade",
              "Reveal how one score can shift your final outcome",
            ],
          },
        ],
        note: "This turns abstract goals into concrete, actionable numbers.",
      },
      {
        title: "Risk and Recovery Analysis",
        body: "Simulations also help you understand academic risk:",
        groups: [
          {
            title: "",
            items: [
              "Identify when you are falling below target",
              "Measure how difficult recovery will be",
              "See whether your goal is still achievable or requires adjustment",
            ],
          },
        ],
        note:
          "AY Grade presents recovery paths so you can respond early instead of reacting late.",
      },
      {
        title: "Dynamic and Real-Time",
        body: "All simulations update automatically as:",
        groups: [
          {
            title: "",
            items: [
              "New grades are entered",
              "Assignments are added or completed",
              "Targets or GPA goals change",
            ],
          },
        ],
        note: "This ensures your predictions remain accurate throughout the semester.",
      },
      {
        title: "Best Practices",
        body: "Practical guidelines for confident planning:",
        bullets: [
          "Run simulations early and often",
          "Use them before major exams or projects",
          "Revisit simulations after every graded assignment",
        ],
      },
    ],
    note:
      "Simulations are where AY Grade delivers its greatest value—turning uncertainty into clear academic foresight.",
  },
  "Tiers & Limits": {
    title: "Free vs Paid",
    intro:
      "AY Grade offers both Free and Paid tiers so students can get started easily and upgrade when they need more flexibility and control.",
    steps: [
      {
        title: "Free Plan",
        body:
          "The Free plan is ideal for exploring AY Grade and managing a limited academic setup.",
        groups: [
          {
            title: "Includes",
            items: [
              "Up to 1 Academic Year",
              "Up to 1 Semester",
              "Up to 3 Courses",
              "Full access to core grade tracking and simulations",
            ],
          },
          {
            title: "Limitations",
            items: [
              "Academic Years, Semesters, and Courses cannot be deleted once created",
              "Designed for evaluation and light usage",
            ],
          },
        ],
      },
      {
        title: "Paid Plan",
        body:
          "The Paid plan unlocks the full power of AY Grade with no structural limits.",
        groups: [
          {
            title: "Includes",
            items: [
              "Unlimited Academic Years, Semesters, and Courses",
              "Full access to all features and simulations",
              "Ability to create, edit, and delete all academic structures",
              "Ideal for long-term planning and multi-year tracking",
            ],
          },
        ],
      },
      {
        title: "Choosing the Right Plan",
        body: "Select the plan that matches your goals and timeline.",
        bullets: [
          "Use the Free plan to test AY Grade with a real course setup",
          "Upgrade to Paid when you need flexibility, cleanup, or multi-term planning",
        ],
      },
    ],
    note: "Tip: Upgrading does not affect your existing data—your academic setup continues seamlessly.",
  },
  "Data & Privacy": {
    title: "Your data",
    intro:
      "Your academic data belongs to you. AY Grade is built with privacy, security, and trust as core principles, ensuring your information remains focused solely on helping you succeed academically.",
    steps: [
      {
        title: "Your Data",
        body: "Your data stays private and focused on your academic success.",
        bullets: [
          "All data is securely tied to your account",
          "Information is used only to power grade tracking, predictions, and insights",
          "Your academic records remain private and under your control",
        ],
        note:
          "AY Grade does not use your data for advertising, profiling, or non-academic purposes.",
      },
      {
        title: "Data Usage",
        body: "Your grades and academic information are used exclusively to:",
        groups: [
          {
            title: "",
            items: [
              "Calculate course and semester performance",
              "Generate simulations and GPA projections",
              "Improve accuracy of insights within your account",
            ],
          },
        ],
        note:
          "Your data is never accessed for reasons unrelated to academic functionality.",
      },
      {
        title: "Data Sharing",
        body: "Your academic data stays private at all times.",
        bullets: [
          "Grades and academic records are never shared with third parties",
          "No data is sold, rented, or exposed to external organizations",
          "Your information is not visible to other users",
        ],
      },
      {
        title: "Security & Control",
        body: "You remain in control of your academic information.",
        bullets: [
          "Access is restricted to authenticated users",
          "You remain in control of your academic structure and information",
          "Upgrades or plan changes do not affect data ownership",
        ],
      },
    ],
    note:
      "Commitment: AY Grade exists to support your academic success—not to monetize your data.",
  },
};

export default function Docs() {
  const [active, setActive] = useState<DocSection>("Overview");

  const activeContent = useMemo(() => content[active], [active]);
  const isStructureSection = useMemo(
    () => ["Academic Years", "Semesters", "Courses"].includes(active),
    [active]
  );

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
            <Link to="/academic-year">Back to Academic Year</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card/85 p-6 sm:p-10 shadow-lg">
          <div className="absolute -top-28 -right-20 h-56 w-56 rounded-full bg-gradient-to-br from-primary/25 to-accent/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-gradient-to-tr from-primary/20 to-primary/10 blur-3xl" />
          <div className="relative z-10 space-y-4">
            <Badge variant="secondary" className="w-fit uppercase tracking-[0.2em]">
              Docs
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold text-gradient">AY Grade Documentation</h1>
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">
                Clear, structured guidance for planning years, tracking coursework, and simulating grade outcomes.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {sections.map((section) => (
                <button
                  key={section}
                  type="button"
                  onClick={() => setActive(section)}
                  className="rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
                >
                  {section}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-[240px,1fr]">
          <Card className="h-fit border-border md:sticky md:top-24">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Navigate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="md:hidden">
                <Select value={active} onValueChange={(value) => setActive(value as DocSection)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Jump to section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem key={section} value={section}>
                        {section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="hidden md:block space-y-1">
                {sections.map((section) => (
                  <Button
                    key={section}
                    variant={active === section ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setActive(section)}
                  >
                    {section}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="border-border bg-card/90 shadow-sm">
              <CardHeader className="pb-2 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/10 text-primary border border-primary/20" variant="outline">
                    Section
                  </Badge>
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {active}
                  </span>
                </div>
                <div>
                  <CardTitle className="text-xl">{activeContent.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{activeContent.intro}</p>
                </div>
              </CardHeader>
              {activeContent.bullets ? (
                <CardContent className="pt-0 text-sm text-foreground">
                  {isStructureSection ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {activeContent.bullets.map((item) => (
                        <div
                          key={item}
                          className="rounded-xl border border-border bg-card p-4 shadow-sm"
                        >
                          <div className="mb-2 h-1 w-10 rounded-full bg-gradient-to-r from-primary to-accent" />
                          <p className="text-sm text-foreground">{item}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {activeContent.bullets.map((item) => (
                        <li key={item} className="flex gap-3">
                          <span className="mt-2 h-2 w-2 rounded-full bg-primary/70" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              ) : null}
            </Card>

            {activeContent.steps ? (
              <div className="grid gap-4">
                {activeContent.steps.map((step, index) => (
                  <Card key={step.title} className="border-border bg-card/90 shadow-sm">
                    <CardHeader className="pb-2 flex flex-row items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">
                        {index + 1}
                      </div>
                      <div className="space-y-1">
                        <CardTitle className="text-base">{step.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">{step.body}</p>
                      </div>
                    </CardHeader>
                    {step.groups ? (
                      <CardContent className="pt-0 text-sm text-foreground space-y-3">
                        {step.groups.map((group) => (
                          <div key={group.title} className="space-y-2">
                            {group.title ? (
                              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                {group.title}
                              </p>
                            ) : null}
                            <ul className="space-y-2">
                              {group.items.map((item) => (
                                <li key={item} className="flex gap-3">
                                  <span className="mt-2 h-2 w-2 rounded-full bg-accent/80" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                        {step.note ? (
                          <p className="text-sm text-muted-foreground">{step.note}</p>
                        ) : null}
                      </CardContent>
                    ) : step.bullets ? (
                      <CardContent className="pt-0 text-sm text-foreground space-y-3">
                        <ul className="space-y-2">
                          {step.bullets.map((item) => (
                            <li key={item} className="flex gap-3">
                              <span className="mt-2 h-2 w-2 rounded-full bg-accent/80" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                        {step.note ? (
                          <p className="text-sm text-muted-foreground">{step.note}</p>
                        ) : null}
                      </CardContent>
                    ) : step.note ? (
                      <CardContent className="pt-0 text-sm text-muted-foreground">
                        {step.note}
                      </CardContent>
                    ) : null}
                  </Card>
                ))}
              </div>
            ) : null}

            {activeContent.note ? (
              <Card className="border-border bg-muted/70">
                <CardContent className="py-3 text-sm text-foreground">
                  {activeContent.note}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
