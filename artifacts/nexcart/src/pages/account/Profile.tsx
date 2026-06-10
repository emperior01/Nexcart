import { useState, useEffect } from "react";
import { User, Lock, Save, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/index";
import { Skeleton } from "@/components/ui/index";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export default function AccountProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d = data as { full_name: string | null; phone: string | null };
          setFullName(d.full_name ?? "");
          setPhone(d.phone ?? "");
        }
        setLoading(false);
      });
  }, [user]);

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert(
        { id: user.id, full_name: fullName || null, phone: phone || null } as any,
        { onConflict: "id" }
      );
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved!");
  }

  async function updatePassword() {
    if (!newPassword.trim()) { toast.error("Enter a new password."); return; }
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match."); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  const initials = ((fullName?.[0] ?? user?.email?.[0] ?? "?")).toUpperCase();

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#F0F0F0] bg-[#FAFAFA]">
          <User className="h-4 w-4 text-[#E8611A]" />
          <h2 className="font-extrabold text-[#0D0D0D] text-sm">Profile Information</h2>
        </div>

        <div className="p-5 space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-extrabold flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}
            >
              {initials}
            </div>
            <div>
              <p className="font-semibold text-[#0D0D0D] text-sm">{fullName || "Set your name below"}</p>
              <p className="text-xs text-[#9B9B9B] mt-0.5">{user?.email}</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-10 rounded-xl" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone (optional)</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 234 567 890"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={user?.email ?? ""} disabled className="opacity-60" />
                <p className="text-xs text-[#9B9B9B]">Email cannot be changed here.</p>
              </div>
            </div>
          )}

          <Button
            onClick={saveProfile}
            disabled={saving || loading}
            className="gap-2 text-white w-full sm:w-auto"
            style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save Profile"}
          </Button>
        </div>
      </div>

      {/* Password section */}
      <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#F0F0F0] bg-[#FAFAFA]">
          <Lock className="h-4 w-4 text-[#E8611A]" />
          <h2 className="font-extrabold text-[#0D0D0D] text-sm">Change Password</h2>
        </div>

        <div className="p-5 space-y-3">
          <div className="space-y-1.5">
            <Label>New Password</Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min. 6 characters)"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B9B9B] hover:text-[#6B7280]"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Confirm New Password</Label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B9B9B] hover:text-[#6B7280]"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            onClick={updatePassword}
            disabled={changingPassword || !newPassword}
            variant="outline"
            className="gap-2 w-full sm:w-auto"
          >
            <Lock className="h-4 w-4" />
            {changingPassword ? "Updating…" : "Update Password"}
          </Button>
        </div>
      </div>
    </div>
  );
}
