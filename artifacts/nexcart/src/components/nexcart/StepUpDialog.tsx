import { useState } from "react";
import { Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/index";
import { toast } from "sonner";

interface StepUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
  description?: string;
}

// Shown when a sensitive action (like requesting a payout) is blocked
// because the session's last password confirmation is too old. On
// success, the caller's onVerified() should retry whatever action
// triggered this.
export function StepUpDialog({ open, onOpenChange, onVerified, description }: StepUpDialogProps) {
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);

  async function handleVerify() {
    if (!password) {
      toast.error("Enter your password.");
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/verify-step-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Incorrect password.");
        return;
      }
      setPassword("");
      onOpenChange(false);
      onVerified();
    } catch (_) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-[#E8611A]" />
            <DialogTitle>Confirm your password</DialogTitle>
          </div>
          <DialogDescription>
            {description ?? "For your security, please re-enter your password to continue with this action."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 py-2">
          <Label>Password</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleVerify(); }}
            placeholder="Enter your password"
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={verifying}>
            Cancel
          </Button>
          <Button
            onClick={handleVerify}
            disabled={verifying}
            className="text-white font-bold"
            style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}
          >
            {verifying ? "Verifying…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
