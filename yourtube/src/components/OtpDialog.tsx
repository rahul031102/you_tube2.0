import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { useUser } from "@/lib/AuthContext";

const OtpDialog = () => {
  const {
    pendingAuth,
    verifyOtp,
    resendOtp,
    savePhoneForPending,
    cancelOtp,
  } = useUser();

  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCode("");
    setPhone("");
    setError(null);
    if (pendingAuth?.devOtp) {
      setInfo(`Dev OTP: ${pendingAuth.devOtp}`);
    } else if (pendingAuth && !pendingAuth.delivered && !pendingAuth.requiresPhone) {
      setInfo(
        "Delivery channel is not configured on the server, so no code was actually sent."
      );
    } else {
      setInfo(null);
    }
  }, [pendingAuth]);

  if (!pendingAuth) return null;

  const channelLabel = pendingAuth.channel === "sms" ? "mobile number" : "email";

  const handleVerify = async () => {
    setError(null);
    setBusy(true);
    try {
      await verifyOtp(code);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Verification failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async (forceEmail = false) => {
    setError(null);
    setBusy(true);
    try {
      await resendOtp({ forceEmail });
      setInfo("A new code has been sent.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not resend code.");
    } finally {
      setBusy(false);
    }
  };

  const handleSavePhone = async () => {
    setError(null);
    setBusy(true);
    try {
      await savePhoneForPending(phone.trim());
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not save phone number.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={!!pendingAuth}
      onOpenChange={(open) => {
        if (!open) cancelOtp();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verify it&apos;s you</DialogTitle>
          <DialogDescription>
            {pendingAuth.requiresPhone
              ? "You're signing in from outside South India, so we need a mobile number to send an SMS code."
              : `We sent a 6-digit code to your ${channelLabel} (${pendingAuth.destination}).`}
          </DialogDescription>
        </DialogHeader>

        {pendingAuth.requiresPhone ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="otp-phone">Mobile number</Label>
              <Input
                id="otp-phone"
                placeholder="+91XXXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => handleResend(true)}
                disabled={busy}
              >
                Use email instead
              </Button>
              <Button onClick={handleSavePhone} disabled={busy || !phone.trim()}>
                Send SMS code
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="otp-code">Verification code</Label>
              <Input
                id="otp-code"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
              />
            </div>
            {info && <p className="text-sm text-muted-foreground">{info}</p>}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => handleResend(false)}
                disabled={busy}
              >
                Resend code
              </Button>
              <Button
                onClick={handleVerify}
                disabled={busy || code.length !== 6}
              >
                Verify
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OtpDialog;
