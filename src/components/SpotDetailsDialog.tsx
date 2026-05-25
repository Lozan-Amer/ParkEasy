import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Spot, PAYMENT_LABEL } from "./ParkingMap";
import { Loader2, Send, Reply, Trash2, Navigation, Clock, AlertTriangle, Trophy } from "lucide-react";
import { toast } from "sonner";

type Comment = {
  id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  display_name?: string | null;
};

export function SpotDetailsDialog({
  spot,
  onClose,
  navigationHref,
  navigationWindowTarget,
}: {
  spot: Spot | null;
  onClose: () => void;
  navigationHref: string;
  navigationWindowTarget: "_blank" | "_top";
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [reporter, setReporter] = useState<{ display_name: string | null; score: number } | null>(null);
  const [alreadyFlagged, setAlreadyFlagged] = useState(false);
  const [flagging, setFlagging] = useState(false);

  const load = async (spotId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("parking_comments")
      .select("id, user_id, parent_id, content, created_at")
      .eq("spot_id", spotId)
      .order("created_at", { ascending: true });
    if (!data) {
      setComments([]);
      setLoading(false);
      return;
    }
    const userIds = [...new Set(data.map((c) => c.user_id))];
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);
    const nameMap = new Map(profs?.map((p) => [p.id, p.display_name]) ?? []);
    setComments(data.map((c) => ({ ...c, display_name: nameMap.get(c.user_id) })));
    setLoading(false);
  };

  useEffect(() => {
    if (!spot) return;
    load(spot.id);
    setAlreadyFlagged(false);
    setReporter(null);

    // Load reporter trust info
    supabase
      .from("parking_spots")
      .select("user_id")
      .eq("id", spot.id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data?.user_id) return;
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name, score")
          .eq("id", data.user_id)
          .maybeSingle();
        if (prof) setReporter(prof);
      });

    // Check if current user already flagged this spot
    if (user) {
      supabase
        .from("spot_wrong_reports")
        .select("id")
        .eq("spot_id", spot.id)
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => setAlreadyFlagged(!!data));
    }

    const channel = supabase
      .channel(`comments_${spot.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parking_comments", filter: `spot_id=eq.${spot.id}` },
        () => load(spot.id)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [spot?.id, user]);

  const post = async () => {
    if (!spot || !user || !text.trim()) return;
    setPosting(true);
    const { error } = await supabase.from("parking_comments").insert({
      spot_id: spot.id,
      user_id: user.id,
      parent_id: replyTo,
      content: text.trim().slice(0, 500),
    });
    setPosting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setText("");
    setReplyTo(null);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("parking_comments").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  const flagWrong = async () => {
    if (!spot || !user || alreadyFlagged) return;
    if (!confirm("האם החניה הזו לא קיימת או לא פנויה? הדיווח יסיר אותה מהמפה.")) return;
    setFlagging(true);
    const { error } = await supabase.from("spot_wrong_reports").insert({
      spot_id: spot.id,
      user_id: user.id,
    });
    setFlagging(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAlreadyFlagged(true);
    toast.success("תודה על הדיווח! החניה הוסרה");
    onClose();
  };

  if (!spot) return null;

  const minsLeft = Math.max(0, Math.round((new Date(spot.expires_at).getTime() - Date.now()) / 60000));
  const roots = comments.filter((c) => !c.parent_id);
  const replies = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

  return (
    <Dialog open={!!spot} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">פרטי החניה</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary">{PAYMENT_LABEL[spot.payment_type]}</Badge>
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            עוד {minsLeft} דק׳
          </Badge>
          {reporter && (
            <Badge variant="outline" className="gap-1">
              <Trophy className="w-3 h-3 text-warning" />
              {reporter.display_name || "נהג"} · {reporter.score}
            </Badge>
          )}
        </div>

        {spot.note && (
          <div className="bg-muted/50 rounded-lg p-3 text-sm">{spot.note}</div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <NavigateButton lat={spot.latitude} lng={spot.longitude} variant="outline" />

          <Button
            variant="outline"
            onClick={flagWrong}
            disabled={flagging || alreadyFlagged}
            className="text-destructive hover:text-destructive"
          >
            {flagging ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 ml-2" />
                {alreadyFlagged ? "דווח" : "דיווח שגוי"}
              </>
            )}
          </Button>
        </div>

        <div className="border-t pt-3 flex-1 overflow-y-auto space-y-3 -mx-6 px-6">
          <h3 className="text-sm font-semibold text-muted-foreground">תגובות ({comments.length})</h3>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : roots.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">אין תגובות עדיין</p>
          ) : (
            roots.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                replies={replies(c.id)}
                currentUserId={user?.id}
                onReply={(id) => setReplyTo(id)}
                onDelete={remove}
              />
            ))
          )}
        </div>

        <div className="border-t pt-3 space-y-2">
          {replyTo && (
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              <span>מגיב/ה לתגובה</span>
              <button onClick={() => setReplyTo(null)} className="text-primary">ביטול</button>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 500))}
              placeholder="כתוב תגובה..."
              maxLength={500}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && post()}
            />
            <Button onClick={post} disabled={posting || !text.trim()} size="icon">
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CommentItem({
  comment,
  replies,
  currentUserId,
  onReply,
  onDelete,
}: {
  comment: Comment;
  replies: Comment[];
  currentUserId?: string;
  onReply: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="bg-muted/40 rounded-lg p-2.5">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-semibold">{comment.display_name || "נהג"}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(comment.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
        <div className="flex gap-3 mt-1.5">
          <button onClick={() => onReply(comment.id)} className="text-xs text-primary flex items-center gap-1">
            <Reply className="w-3 h-3" /> הגב
          </button>
          {currentUserId === comment.user_id && (
            <button
              onClick={() => onDelete(comment.id)}
              className="text-xs text-destructive flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> מחק
            </button>
          )}
        </div>
      </div>
      {replies.length > 0 && (
        <div className="pr-4 space-y-2 border-r-2 border-muted">
          {replies.map((r) => (
            <div key={r.id} className="bg-muted/20 rounded-lg p-2.5 mr-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold">{r.display_name || "נהג"}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words">{r.content}</p>
              {currentUserId === r.user_id && (
                <button
                  onClick={() => onDelete(r.id)}
                  className="text-xs text-destructive flex items-center gap-1 mt-1"
                >
                  <Trash2 className="w-3 h-3" /> מחק
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
