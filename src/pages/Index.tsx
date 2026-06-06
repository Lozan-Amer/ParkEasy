import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ParkingMap, Spot, PAYMENT_LABEL } from "@/components/ParkingMap";
import { ReportSpotDialog } from "@/components/ReportSpotDialog";
import { SpotDetailsDialog } from "@/components/SpotDetailsDialog";
import { SpotFilters, DEFAULT_FILTERS, Filters } from "@/components/SpotFilters";
import { LeaderboardDialog } from "@/components/LeaderboardDialog";
import { NavigateButton } from "@/components/NavigateButton";
import { MyCarDialog, ParkedCar } from "@/components/MyCarDialog";
import { toast } from "sonner";
import { LogOut, MapPin, Navigation, Car, RefreshCw, Loader2, Trophy, ParkingCircle, Share2 } from "lucide-react";

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
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [myCarOpen, setMyCarOpen] = useState(false);
  const [parkedCar, setParkedCar] = useState<ParkedCar | null>(null);
  const navigationWindowTarget = "_blank" as const;

  const loadParkedCar = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("parked_cars")
      .select("id, latitude, longitude, note, photo_path, created_at")
      .eq("user_id", user.id)
      .maybeSingle();
    setParkedCar((data as ParkedCar) ?? null);
  };

  useEffect(() => {
    if (user) loadParkedCar();
  }, [user]);

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
    // Optimistic: close dialog + show spot immediately
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 2 * 60 * 60_000);
    const tempId = `tmp-${crypto.randomUUID()}`;
    const optimistic: Spot = {
      id: tempId,
      latitude: position[0],
      longitude: position[1],
      note: note || null,
      payment_type: payment,
      duration_minutes: duration,
      expires_at: expiresAt.toISOString(),
      created_at: now.toISOString(),
    };
    setSpots((prev) => [optimistic, ...prev]);
    setScore((s) => s + 10);
    setReportOpen(false);
    toast.success("דיווחת על חניה! +10 נקודות 🎉");

    // Persist in background
    (async () => {
      const { data, error } = await supabase
        .from("parking_spots")
        .insert({
          user_id: user.id,
          latitude: position[0],
          longitude: position[1],
          note: note || null,
          payment_type: payment,
          duration_minutes: duration,
          expires_at: expiresAt.toISOString(),
        })
        .select("id, latitude, longitude, note, expires_at, created_at, payment_type, duration_minutes")
        .single();
      if (error) {
        setSpots((prev) => prev.filter((s) => s.id !== tempId));
        setScore((s) => Math.max(0, s - 10));
        toast.error(error.message || "שגיאה בדיווח");
        return;
      }
      if (data) {
        setSpots((prev) => [data as Spot, ...prev.filter((s) => s.id !== tempId)]);
      }
    })();
  };

  const getNavigationHref = (s: Spot) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}&travelmode=driving`;
    const wazeUrl = `https://waze.com/ul?ll=${s.latitude},${s.longitude}&navigate=yes`;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    return isMobile ? wazeUrl : url;
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

  const filteredSpots = useMemo(() => {
    return spots
      .filter((s) => filters.payments.includes(s.payment_type))
      .filter((s) => distanceKm(position, [s.latitude, s.longitude]) <= filters.maxDistanceKm)
      .filter((s) => {
        const minsLeft = Math.max(0, (new Date(s.expires_at).getTime() - Date.now()) / 60000);
        return minsLeft >= filters.minMinutesLeft;
      });
  }, [spots, filters, position]);

  const sortedSpots = [...filteredSpots].sort(
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
      <header className="px-4 pt-4 pb-3 z-30 text-white" style={{ background: "var(--gradient-header)" }}>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-[var(--shadow-glow)]" style={{ background: "var(--gradient-primary)" }}>
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-white text-lg leading-tight tracking-tight">ParkEasy</h1>
              <p className="text-[hsl(var(--ocean-mint))] text-[11px] leading-tight">שלום, {displayName || "נהג"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={async () => {
                const url = `https://www.google.com/maps?q=${position[0]},${position[1]}`;
                const text = `📍 המיקום שלי כרגע: ${url}`;
                if (navigator.share) {
                  try {
                    await navigator.share({ title: "המיקום שלי", text, url });
                    return;
                  } catch {
                    // user cancelled, fall through to whatsapp
                  }
                }
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
              }}
              aria-label="שתף מיקום"
              className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button onClick={signOut} aria-label="התנתק" className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => setLeaderboardOpen(true)}
            className="bg-[hsl(var(--ocean-deep))]/60 hover:bg-[hsl(var(--ocean-deep))]/80 p-3 rounded-2xl border border-[hsl(var(--ocean-teal))]/30 transition text-right"
            aria-label="לוח מובילים"
          >
            <p className="text-[hsl(var(--ocean-mint))] text-[10px] font-bold uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
              <Trophy className="w-3 h-3" /> ניקוד קהילה
            </p>
            <span className="font-display text-white font-bold text-lg">{score.toLocaleString()}</span>
          </button>
          <button
            onClick={() => setMyCarOpen(true)}
            className={`p-3 rounded-2xl flex flex-col justify-center items-center transition active:scale-95 ${
              parkedCar
                ? "bg-[hsl(var(--ocean-mint))] text-[hsl(var(--ocean-deep))]"
                : "bg-[hsl(var(--ocean-teal))] text-white"
            }`}
            aria-label="הרכב שלי"
          >
            <ParkingCircle className="w-5 h-5 mb-1" />
            <span className="text-xs font-bold">{parkedCar ? "הרכב שלי" : "שמור מיקום חניה"}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 relative isolate z-0">
        <ParkingMap center={position} spots={filteredSpots} onSpotClick={setSelectedSpot} />

        <div className="absolute top-4 left-4 z-[500] flex flex-col gap-2">
          <button
            onClick={loadSpots}
            className="w-11 h-11 rounded-full bg-card shadow-[var(--shadow-elevated)] flex items-center justify-center hover:scale-105 transition"
            aria-label="רענן"
          >
            <RefreshCw className="w-5 h-5 text-foreground" />
          </button>
          <SpotFilters filters={filters} onChange={setFilters} activeCount={filteredSpots.length} />
        </div>

        <div className="absolute top-4 right-4 z-[500] px-4 py-2 rounded-full bg-white/95 backdrop-blur-md shadow-[var(--shadow-elevated)] border border-white/50 flex items-center gap-2">
          <span className="w-2 h-2 bg-[hsl(var(--success))] rounded-full animate-pulse" />
          <span className="text-sm font-bold text-[hsl(var(--ocean-deep))]">{filteredSpots.length} חניות פנויות</span>
        </div>
      </div>

      <div className="bg-card border-t shadow-[0_-10px_40px_-10px_rgba(12,35,64,0.25)] rounded-t-[2rem] z-30 -mt-4 relative">
        <div className="p-4 pt-5">
          <Button
            onClick={() => setReportOpen(true)}
            disabled={reporting}
            size="lg"
            className="w-full h-14 text-base font-bold rounded-2xl shadow-[var(--shadow-elevated)] hover:shadow-[var(--shadow-glow)] transition-all bg-[hsl(var(--ocean-deep))] hover:bg-[hsl(var(--ocean-mid))] text-white"
          >
            <span className="w-8 h-8 rounded-lg bg-[hsl(var(--ocean-mint))] flex items-center justify-center ml-2">
              <Car className="w-5 h-5 text-[hsl(var(--ocean-deep))]" />
            </span>
            דווח על חניה פנויה
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
                      
                    </div>
                    <NavigateButton spotId={s.id} lat={s.latitude} lng={s.longitude} variant="ghost" size="sm" className="text-primary">
                      <Navigation className="w-4 h-4 ml-1" />
                      נווט
                    </NavigateButton>
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

      <SpotDetailsDialog
        spot={selectedSpot}
        onClose={() => setSelectedSpot(null)}
        navigationHref={selectedSpot ? getNavigationHref(selectedSpot) : "#"}
        navigationWindowTarget={navigationWindowTarget}
      />

      <LeaderboardDialog
        open={leaderboardOpen}
        onOpenChange={setLeaderboardOpen}
        currentUserId={user?.id}
      />

      <MyCarDialog
        open={myCarOpen}
        onOpenChange={setMyCarOpen}
        userId={user.id}
        position={position}
        parkedCar={parkedCar}
        onChanged={loadParkedCar}
      />
    </div>
  );
};

export default Index;
