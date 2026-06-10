import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { Navbar } from "@/components/nexcart/Navbar";
import { Footer } from "@/components/nexcart/Footer";
import { useAuth } from "@/hooks/use-auth";

export default function AddressesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 sm:px-6">
        <div className="flex items-center gap-3 mb-8">
          <div
            className="grid h-12 w-12 place-items-center rounded-2xl text-white"
            style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}
          >
            <MapPin className="h-6 w-6" />
          </div>
          <div>
            <p className="font-extrabold text-foreground text-lg">My Addresses</p>
            <p className="text-xs text-muted-foreground">Saved delivery addresses</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-8 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FEF0E8] flex items-center justify-center mb-4">
            <MapPin className="h-7 w-7 text-[#E8611A]" />
          </div>
          <h3 className="font-extrabold text-foreground mb-1">No saved addresses</h3>
          <p className="text-sm text-muted-foreground">
            Your delivery addresses will be saved during checkout.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
