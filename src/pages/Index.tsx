import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ParkingMap, Spot, PAYMENT_LABEL } from "@/components/ParkingMap";
import { ReportSpotDialog } from "@/components/ReportSpotDialog";
import { SpotDetailsDialog } from "@/components/SpotDetailsDialog";
import { toast } from "sonner";
import { LogOut, MapPin, Navigation, Car, RefreshCw, Loader2, Trophy } from "lucide-react";

const TEL_AVIV: [number, number] = [32.0853, 34.7818];

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [position, setPosition] = useState<[number, number]>(TEL_AVIV);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [reporting, setReporting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [score, setScore] = useState(0);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
      () => toast.error("לא הצלחנו לאתר את המיקום שלך — מציג תל אביב"),
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("score, display_name").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setScore(data.score);
        setDisplayName(data.display_name ?? "");
      }
    });
  }, [user]);

  const loadSpots = async () => {
    const { data } = await supabase
      .from("parking_spots")
      .select("id, latitude, longitude, note, expires_at, created_at, payment_type, duration_minutes")
      .gt("expires_at", new Date().toISOString())
      .eq("status", "available")
      .order("created_at", { ascending: false });
    if (data) setSpots(data as Spot[]);
  };

  useEffect(() => {
    if (!user) return;
    loadSpots();
    const channel = supabase
      .channel("parking_spots_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "parking_spots" }, () => loadSpots())
      .subscribe();
    const interval = setInterval(loadSpots, 30000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user]);

  const handleReport = async ({
    duration,
    note,
    payment,
  }: {
    duration: number;
    note: string;
    payment: Spot["payment_type"];
  }) => {
    if (!user) return;
    setReporting(true);
    try {
      const expiresAt = new Date(Date.now() + duration * 60_000).toISOString();
      const { error } = await supabase.from("parking_spots").insert({
        user_id: user.id,
        latitude: position[0],
        longitude: position[1],
        note: note || null,
        payment_type: payment,
        duration_minutes: duration,
        expires_at: expiresAt,
      });
      if (error) throw error;
      toast.success("דיווחת על חניה! +10 נקודות 🎉");
      setScore((s) => s + 10);
      setReportOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setReporting(false);
    }
  };

  const navigateTo = (s: Spot) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}&travelmode=driving`;
    const wazeUrl = `https://waze.com/ul?ll=${s.latitude},${s.longitude}&navigate=yes`;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const target = isMobile ? wazeUrl : url;
    const a = document.createElement("a");
    a.href = target;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("פותח ניווט...");
  };

  const distanceKm = (a: [number, number], b: [number, number]) => {
    const toRad = (n: number) => (n * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b[0] - a[0]);
    const dLon = toRad(b[1] - a[1]);
    const lat1 = toRad(a[0]);
    const lat2 = toRad(b[0]);
    const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return 2 * R * Math.asin(Math.sqrt(x));
  };

  const sortedSpots = [...spots].sort(
    (a, b) => distanceKm(position, [a.latitude, a.longitude]) - distanceKm(position, [b.latitude, b.longitude])
  );

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      <header className="flex items-center justify-between px-4 py-3 bg-card border-b shadow-[var(--shadow-soft)] z-30">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-foreground leading-tight">ParkEasy</h1>
            <p className="text-xs text-muted-foreground leading-tight">שלום, {displayName || "נהג"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/10 text-warning border border-warning/20">
            <Trophy className="w-4 h-4" />
            <span className="font-bold text-sm">{score}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="התנתק">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 relative isolate z-0">
        <ParkingMap center={position} spots={spots} onSpotClick={setSelectedSpot} />

        <button
          onClick={loadSpots}
          className="absolute top-4 left-4 z-[500] w-11 h-11 rounded-full bg-card shadow-[var(--shadow-elevated)] flex items-center justify-center hover:scale-105 transition"
          aria-label="רענן"
        >
          <RefreshCw className="w-5 h-5 text-foreground" />
        </button>

        <div className="absolute top-4 right-4 z-[500] px-4 py-2 rounded-full bg-card shadow-[var(--shadow-elevated)]">
          <span className="text-sm font-medium text-foreground">{spots.length} חניות זמינות</span>
        </div>
      </div>

      <div className="bg-card border-t shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.08)] z-30">
        <div className="p-4">
          <Button
            onClick={() => setReportOpen(true)}
            disabled={reporting}
            size="lg"
            className="w-full h-14 text-base font-bold shadow-[var(--shadow-elevated)] hover:shadow-[var(--shadow-glow)] transition-all"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Car className="w-5 h-5 ml-2" />
            אני יוצא — דווח על חניה פנויה
          </Button>
        </div>

        <div className="px-4 pb-4 max-h-48 overflow-y-auto">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">חניות קרובות</h2>
          {sortedSpots.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">אין חניות זמינות כרגע. תהיה הראשון לדווח!</p>
          ) : (
            <div className="space-y-2">
              {sortedSpots.slice(0, 5).map((s) => {
                const dist = distanceKm(position, [s.latitude, s.longitude]);
                const minsLeft = Math.max(0, Math.round((new Date(s.expires_at).getTime() - Date.now()) / 60000));
                return (
                  <Card
                    key={s.id}
                    className="p-3 flex items-center gap-3 hover:shadow-[var(--shadow-soft)] transition cursor-pointer"
                    onClick={() => setSelectedSpot(s)}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {dist < 1 ? `${Math.round(dist * 1000)} מ׳` : `${dist.toFixed(1)} ק״מ`}
                        </span>
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                          {PAYMENT_LABEL[s.payment_type]}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">פג תוקף בעוד {minsLeft} דק׳</div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateTo(s);
                      }}
                    >
                      <Navigation className="w-4 h-4 ml-1" />
                      נווט
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ReportSpotDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        onSubmit={handleReport}
        submitting={reporting}
      />

      <SpotDetailsDialog spot={selectedSpot} onClose={() => setSelectedSpot(null)} onNavigate={navigateTo} />
    </div>
  );
};

export default Index;
