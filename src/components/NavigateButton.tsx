import { Button, ButtonProps } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Navigation } from "lucide-react";
import { useState, MouseEvent, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  lat: number;
  lng: number;
  spotId?: string;
  children?: ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
};

function isMobileDevice() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function NavigateButton({ lat, lng, spotId, children, variant = "outline", size, className }: Props) {
  const [open, setOpen] = useState(false);

  const markTaken = async () => {
    if (!spotId) return;
    const { error } = await supabase.rpc("mark_spot_taken", { _spot_id: spotId });
    if (!error) {
      toast.success("החניה סומנה כתפוסה — בהצלחה! 🚗");
    }
  };

  const openIn = async (target: "waze" | "google") => {
    const mobile = isMobileDevice();
    const ios = isIOS();

    let url: string;
    if (target === "waze") {
      url = mobile
        ? `waze://?ll=${lat},${lng}&navigate=yes`
        : `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    } else {
      if (mobile) {
        url = ios
          ? `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`
          : `google.navigation:q=${lat},${lng}`;
      } else {
        url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
      }
    }

    await markTaken();
    setOpen(false);
    if (mobile) {
      window.location.href = url;
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          className={className}
          onClick={(e: MouseEvent) => {
            e.stopPropagation();
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
        >
          {children ?? (
            <>
              <Navigation className="w-4 h-4 ml-2" />
              נווט
            </>
          )}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent
        className="max-w-xs"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>איך לנווט?</AlertDialogTitle>
          <AlertDialogDescription>בחר את אפליקציית הניווט המועדפת עליך</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => openIn("waze")}
            className="h-14 font-bold"
            style={{ background: "hsl(195 100% 45%)", color: "white" }}
          >
            Waze
          </Button>
          <Button
            onClick={() => openIn("google")}
            variant="outline"
            className="h-14 font-bold"
          >
            Google Maps
          </Button>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>ביטול</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
