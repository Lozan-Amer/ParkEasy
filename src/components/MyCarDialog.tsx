import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Camera, Car, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NavigateButton } from "./NavigateButton";

export type ParkedCar = {
  id: string;
  latitude: number;
  longitude: number;
  note: string | null;
  photo_path: string | null;
  created_at: string;
};

export function MyCarDialog({
  open,
  onOpenChange,
  userId,
  position,
  parkedCar,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
  position: [number, number];
  parkedCar: ParkedCar | null;
  onChanged: () => void;
}) {
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setNote(parkedCar?.note ?? "");
      setFile(null);
      setPreview(null);
    }
  }, [open, parkedCar]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (parkedCar?.photo_path) {
        const { data } = await supabase.storage
          .from("parked-cars")
          .createSignedUrl(parkedCar.photo_path, 3600);
        if (active) setPhotoUrl(data?.signedUrl ?? null);
      } else {
        setPhotoUrl(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [parkedCar]);

  const onPick = (f: File | null) => {
    setFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      let photo_path = parkedCar?.photo_path ?? null;
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("parked-cars")
          .upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) throw upErr;
        if (parkedCar?.photo_path) {
          await supabase.storage.from("parked-cars").remove([parkedCar.photo_path]);
        }
        photo_path = path;
      }

      const { error } = await supabase.from("parked_cars").upsert(
        {
          user_id: userId,
          latitude: position[0],
          longitude: position[1],
          note: note.trim() || null,
          photo_path,
        },
        { onConflict: "user_id" }
      );
      if (error) throw error;
      toast.success("שמרנו את מיקום הרכב שלך! 🚗");
      onChanged();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  const clearCar = async () => {
    if (!parkedCar) return;
    setSaving(true);
    try {
      if (parkedCar.photo_path) {
        await supabase.storage.from("parked-cars").remove([parkedCar.photo_path]);
      }
      const { error } = await supabase.from("parked_cars").delete().eq("user_id", userId);
      if (error) throw error;
      toast.success("מחקנו את מיקום הרכב");
      onChanged();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">
            {parkedCar ? "הרכב שלי" : "שמירת מיקום הרכב"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {parkedCar && (
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
              <div className="text-sm text-muted-foreground">
                נשמר ב-{new Date(parkedCar.created_at).toLocaleString("he-IL")}
              </div>
              {photoUrl && (
                <img
                  src={photoUrl}
                  alt="הרכב שלי"
                  className="w-full max-h-56 object-cover rounded-md"
                />
              )}
              <NavigateButton
                lat={parkedCar.latitude}
                lng={parkedCar.longitude}
                className="w-full"
              >
                <Car className="w-4 h-4 ml-2" />
                נווט אל הרכב שלי
              </NavigateButton>
            </div>
          )}

          <div>
            <Label className="mb-2 block">
              {parkedCar ? "עדכון מיקום למיקום הנוכחי" : "המיקום הנוכחי שלך יישמר"}
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 200))}
              placeholder="הערה (למשל: קומה -2, ליד עמוד B12)"
              rows={2}
              className="resize-none"
            />
          </div>

          <div>
            <Label className="mb-2 block">תמונה (אופציונלי)</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => onPick(e.target.files?.[0] ?? null)}
            />
            {preview ? (
              <div className="relative">
                <img src={preview} alt="תצוגה מקדימה" className="w-full max-h-56 object-cover rounded-md" />
                <button
                  type="button"
                  onClick={() => onPick(null)}
                  className="absolute top-2 left-2 bg-black/60 text-white rounded-full p-1"
                  aria-label="הסר תמונה"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileRef.current?.click()}
              >
                <Camera className="w-4 h-4 ml-2" />
                צלם / העלה תמונה
              </Button>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          {parkedCar && (
            <Button variant="destructive" onClick={clearCar} disabled={saving} size="lg">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button onClick={save} disabled={saving} className="flex-1" size="lg">
            {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Car className="w-4 h-4 ml-2" />}
            {parkedCar ? "עדכן מיקום" : "שמרתי פה"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
