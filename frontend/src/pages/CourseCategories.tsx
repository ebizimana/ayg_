import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CategoryModal, type CategoryFormData } from "@/components/modals";
import { useToast } from "@/hooks/use-toast";
import { http } from "@/lib/http";
import { Bell, ChevronDown, GraduationCap, LogOut, Plus, Settings, User } from "lucide-react";

type Category = { id: string; name: string; weightPercent: number; dropLowest?: number; assignmentsCount?: number };
type CourseResponse = { name?: string };

export default function CourseCategories() {
  const { courseId } = useParams<{ courseId: string }>();
  const nav = useNavigate();
  const { toast } = useToast();

  const [courseName, setCourseName] = useState("Course");
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "weight" | "count">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const loadData = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const [course, cats] = await Promise.all([
        http<CourseResponse>(`/courses/${courseId}`),
        http<any[]>(`/courses/${courseId}/categories`),
      ]);
      if (course?.name) setCourseName(course.name);
      const mapped: Category[] =
        cats?.map((c: any) => ({
          id: c.id,
          name: c.name,
          weightPercent: c.weightPercent,
          dropLowest: c.dropLowest,
          assignmentsCount: c._count?.assignments ?? 0,
        })) ?? [];
      setCategories(mapped);
    } catch (err) {
      toast({
        title: "Failed to load categories",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [courseId, toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    categories.forEach((c) => {
      map[c.id] = c.assignmentsCount ?? 0;
    });
    return map;
  }, [categories]);

  const sortedCategories = useMemo(() => {
    const list = [...categories];
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name) * dir;
      if (sortBy === "weight") return ((a.weightPercent ?? 0) - (b.weightPercent ?? 0)) * dir;
      return ((counts[a.id] ?? 0) - (counts[b.id] ?? 0)) * dir;
    });
    return list;
  }, [categories, counts, sortBy, sortDir]);

  const toggleSort = (col: "name" | "weight" | "count") => {
    if (sortBy === col) setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

  const openAdd = () => {
    setEditingCategory(null);
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setModalOpen(true);
  };

  const handleSave = async (data: CategoryFormData) => {
    if (!courseId) return;
    try {
      if (editingCategory) {
        await http(`/categories/${editingCategory.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: data.name,
            weightPercent: data.weight,
            dropLowest: data.dropLowest ? data.dropCount : 0,
          }),
        });
        toast({ title: "Category updated", description: data.name });
      } else {
        await http(`/courses/${courseId}/categories`, {
          method: "POST",
          body: JSON.stringify({
            name: data.name,
            weightPercent: data.weight,
            dropLowest: data.dropLowest ? data.dropCount : 0,
          }),
        });
        toast({ title: "Category added", description: data.name });
      }
      setEditingCategory(null);
      setModalOpen(false);
      await loadData();
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteCategory) return;
    try {
      await http(`/categories/${confirmDeleteCategory.id}`, { method: "DELETE" });
      toast({ title: "Category deleted", description: confirmDeleteCategory.name });
      setConfirmDeleteCategory(null);
      setModalOpen(false);
      await loadData();
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const signOut = () => {
    localStorage.clear();
    nav("/auth?mode=login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-slate-50 pb-12">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground hidden sm:block">AYG</span>
            </Link>
            <span className="text-slate-400">›</span>
            <Link to={`/courses/${courseId}`} className="font-semibold text-slate-700 hover:text-primary">
              {courseName}
            </Link>
            <span className="text-slate-400">›</span>
            <span className="font-semibold text-slate-700">Categories</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span>{localStorage.getItem("ayg_email") ?? "Profile"}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <Card className="border-slate-200 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl">Manage categories</CardTitle>
            <Button variant="outline" className="gap-2" onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add category
            </Button>
          </CardHeader>
          <CardContent className="overflow-hidden">
            <div className="grid grid-cols-3 bg-slate-50 text-sm font-semibold text-slate-600 rounded-t-lg border border-slate-200">
              <button className="px-4 py-3 text-left flex items-center gap-1 hover:text-primary" onClick={() => toggleSort("name")}>
                Name {sortBy === "name" && <ChevronDown className={`h-4 w-4 ${sortDir === "asc" ? "-rotate-180" : ""}`} />}
              </button>
              <button className="px-4 py-3 text-left flex items-center gap-1 hover:text-primary" onClick={() => toggleSort("weight")}>
                Weight {sortBy === "weight" && <ChevronDown className={`h-4 w-4 ${sortDir === "asc" ? "-rotate-180" : ""}`} />}
              </button>
              <button className="px-4 py-3 text-right flex items-center gap-1 justify-end hover:text-primary" onClick={() => toggleSort("count")}>
                Assignments {sortBy === "count" && <ChevronDown className={`h-4 w-4 ${sortDir === "asc" ? "-rotate-180" : ""}`} />}
              </button>
            </div>
            <div className="divide-y divide-slate-200 border border-t-0 border-slate-200 rounded-b-lg">
              {sortedCategories.map((cat) => (
                <div key={cat.id} className="grid grid-cols-3 items-center bg-white hover:bg-slate-50 transition-colors">
                  <button
                    className="px-4 py-3 text-left font-semibold text-foreground hover:text-primary"
                    onClick={() => openEdit(cat)}
                  >
                    {cat.name}
                  </button>
                  <div className="px-4 py-3 text-muted-foreground">{cat.weightPercent}%</div>
                  <div className="px-4 py-3 text-right font-semibold">{counts[cat.id] ?? 0}</div>
                </div>
              ))}
              {categories.length === 0 && (
                <div className="px-4 py-3 text-sm text-muted-foreground">No categories yet.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <CategoryModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={handleSave}
        onDelete={
          editingCategory
            ? () => {
                setConfirmDeleteCategory(editingCategory);
              }
            : undefined
        }
        initialData={
          editingCategory
            ? {
                name: editingCategory.name,
                weight: editingCategory.weightPercent,
                dropLowest: (editingCategory.dropLowest ?? 0) > 0,
                dropCount: editingCategory.dropLowest ?? 0,
              }
            : undefined
        }
      />

      <AlertDialog open={!!confirmDeleteCategory} onOpenChange={(open) => !open && setConfirmDeleteCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDeleteCategory?.name}?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">Assignments will remain but lose their category tag.</p>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDeleteCategory(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>
              Delete category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
