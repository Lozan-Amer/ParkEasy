import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Loader2 } from "lucide-react";

type LeaderRow = { id: string; display_name: string | null; score: number };

export function LeaderboardDialog({
  open,
  onOpenChange,
  currentUserId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  currentUserId?: string;
}) {
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("profiles")
      .select("id, display_name, score")
      .order("score", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setRows((data ?? []) as LeaderRow[]);
        setLoading(false);
      });
  }, [open]);

  const medal = (i: number) => {
    if (i === 0) return "text-yellow-500";
    if (i === 1) return "text-gray-400";
    if (i === 2) return "text-amber-700";
    return "text-muted-foreground";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center gap-2">
            <Trophy className="w-5 h-5 text-warning" />
            לוח המובילים
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">אין משתמשים עדיין</p>
        ) : (
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
            {rows.map((r, i) => (
              <div
                key={r.id}
                className={`flex items-center gap-3 p-2.5 rounded-lg ${
                  r.id === currentUserId ? "bg-primary/10 border border-primary/30" : "bg-muted/40"
                }`}
              >
                <div className="w-7 text-center font-bold">
                  {i < 3 ? <Medal className={`w-5 h-5 mx-auto ${medal(i)}`} /> : i + 1}
                </div>
                <div className="flex-1 text-sm font-medium truncate">
                  {r.display_name || "נהג"}
                  {r.id === currentUserId && (
                    <span className="text-xs text-primary mr-1">(אני)</span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-warning font-bold text-sm">
                  <Trophy className="w-3.5 h-3.5" />
                  {r.score}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground text-center pt-2">
          +10 על כל דיווח · −10 אם הדיווח סומן כשגוי
        </p>
      </DialogContent>
    </Dialog>
  );
}
