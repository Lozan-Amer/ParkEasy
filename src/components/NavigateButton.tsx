import { Button, ButtonProps } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Navigation } from "lucide-react";
import { useState, MouseEvent, ReactNode } from "react";

type Props = {
  lat: number;
  lng: number;
  children?: ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
};

export function NavigateButton({ lat, lng, children, variant = "outline", size, className }: Props) {
  const [open, setOpen] = useState(false);

  const openIn = (target: "waze" | "google") => {
    const url =
      target === "waze"
        ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
        : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={(e: MouseEvent) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {children ?? (
          <>
            <Navigation className="w-4 h-4 ml-2" />
            נווט
          </>
        )}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-w-xs">
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
    </>
  );
}
