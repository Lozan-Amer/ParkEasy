import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal, X } from "lucide-react";
import { PaymentType, PAYMENT_LABEL } from "./ParkingMap";

export type Filters = {
  maxDistanceKm: number;
  minMinutesLeft: number;
  payments: PaymentType[];
};

export const DEFAULT_FILTERS: Filters = {
  maxDistanceKm: 5,
  minMinutesLeft: 0,
  payments: ["free", "metered", "paid_lot", "private"],
};

export function SpotFilters({
  filters,
  onChange,
  activeCount,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  activeCount: number;
}) {
  const togglePayment = (p: PaymentType) => {
    const set = new Set(filters.payments);
    if (set.has(p)) set.delete(p);
    else set.add(p);
    onChange({ ...filters, payments: Array.from(set) as PaymentType[] });
  };

  const isDirty =
    filters.maxDistanceKm !== DEFAULT_FILTERS.maxDistanceKm ||
    filters.minMinutesLeft !== DEFAULT_FILTERS.minMinutesLeft ||
    filters.payments.length !== DEFAULT_FILTERS.payments.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative w-11 h-11 rounded-full bg-card shadow-[var(--shadow-elevated)] flex items-center justify-center hover:scale-105 transition"
          aria-label="סנן"
        >
          <SlidersHorizontal className="w-5 h-5 text-foreground" />
          {isDirty && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" className="w-72 z-[600]" dir="rtl">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">סינון חניות</h3>
            {isDirty && (
              <button
                onClick={() => onChange(DEFAULT_FILTERS)}
                className="text-xs text-primary flex items-center gap-1"
              >
                <X className="w-3 h-3" /> נקה
              </button>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              מרחק מקסימלי: עד {filters.maxDistanceKm} ק״מ
            </Label>
            <Slider
              value={[filters.maxDistanceKm]}
              min={0.5}
              max={20}
              step={0.5}
              onValueChange={(v) => onChange({ ...filters, maxDistanceKm: v[0] })}
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              עוד לפחות: {filters.minMinutesLeft} דק׳
            </Label>
            <Slider
              value={[filters.minMinutesLeft]}
              min={0}
              max={60}
              step={5}
              onValueChange={(v) => onChange({ ...filters, minMinutesLeft: v[0] })}
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">סוג חניה</Label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(PAYMENT_LABEL) as PaymentType[]).map((p) => {
                const active = filters.payments.includes(p);
                return (
                  <Badge
                    key={p}
                    variant={active ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => togglePayment(p)}
                  >
                    {PAYMENT_LABEL[p]}
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
