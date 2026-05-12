import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Car } from "lucide-react";
import { PaymentType, PAYMENT_LABEL } from "./ParkingMap";

const DURATIONS = [10, 15, 30, 60, 120] as const;

export function ReportSpotDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (data: { duration: number; note: string; payment: PaymentType }) => void;
  submitting: boolean;
}) {
  const [duration, setDuration] = useState<number>(15);
  const [note, setNote] = useState("");
  const [payment, setPayment] = useState<PaymentType>("free");

  const handle = () => {
    onSubmit({ duration, note: note.trim().slice(0, 200), payment });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">דיווח על חניה פנויה</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div>
            <Label className="mb-2 block">תוך כמה זמן תתפנה?</Label>
            <div className="grid grid-cols-5 gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`py-2 rounded-lg text-sm font-medium border transition ${
                    duration === d
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-input text-foreground hover:border-primary/40"
                  }`}
                >
                  {d < 60 ? `${d}׳` : `${d / 60} שע׳`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block">סוג החניה</Label>
            <RadioGroup
              value={payment}
              onValueChange={(v) => setPayment(v as PaymentType)}
              className="grid grid-cols-2 gap-2"
            >
              {(Object.keys(PAYMENT_LABEL) as PaymentType[]).map((p) => (
                <label
                  key={p}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition ${
                    payment === p ? "border-primary bg-primary/5" : "border-input"
                  }`}
                >
                  <RadioGroupItem value={p} />
                  <span className="text-sm">{PAYMENT_LABEL[p]}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="note" className="mb-2 block">
              הודעה (אופציונלי)
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 200))}
              placeholder="לדוגמה: ליד הבנק, צד שמאל"
              maxLength={200}
              className="resize-none"
              rows={2}
            />
            <p className="text-xs text-muted-foreground mt-1 text-left">{note.length}/200</p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handle} disabled={submitting} className="w-full" size="lg">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Car className="w-4 h-4 ml-2" />}
            פרסם דיווח
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
