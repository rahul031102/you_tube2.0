import React, { useEffect, useState } from "react";
import { useUser } from "@/lib/AuthContext";
import DownloadsContent from "@/components/DownloadsContent";
import UpgradePremium from "@/components/UpgradePremium";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/lib/axiosinstance";

const Profile = () => {
  const { user, login } = useUser();
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setPhone(user?.phone || "");
  }, [user?.phone]);

  const handleSavePhone = async () => {
    if (!user?._id) return;
    setSaving(true);
    setStatus(null);
    try {
      const { data } = await axiosInstance.patch(`/user/update/${user._id}`, {
        phone: phone.trim(),
      });
      login(data);
      setStatus("Mobile number saved.");
    } catch {
      setStatus("Could not save mobile number.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex-1 p-6">
      <div className="max-w-4xl space-y-6">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Profile</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage your plan and access downloaded videos from one place.
              </p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-sm text-gray-500">Current plan</p>
              <p className="text-lg font-semibold text-blue-600">
                {user?.plan === "gold"
                  ? "Gold"
                  : user?.plan === "silver"
                  ? "Silver"
                  : user?.plan === "bronze"
                  ? "Bronze"
                  : "Free"}
              </p>
              {user?.plan !== "gold" && (
                <div className="mt-3">
                  <UpgradePremium />
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border bg-muted p-4">
              <p className="text-sm text-gray-500">Name</p>
              <p className="mt-1 font-medium">{user?.name || "Not available"}</p>
            </div>
            <div className="rounded-xl border bg-muted p-4">
              <p className="text-sm text-gray-500">Email</p>
              <p className="mt-1 font-medium">{user?.email || "Not available"}</p>
            </div>
          </div>
          <div className="mt-6 rounded-xl border bg-muted p-4">
            <p className="text-sm text-gray-500">Mobile number</p>
            <p className="text-xs text-gray-500 mb-2">
              Used to send your login OTP when you sign in from outside South
              India.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                placeholder="+91XXXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="sm:max-w-xs"
              />
              <Button onClick={handleSavePhone} disabled={saving}>
                {saving ? "Saving..." : "Save number"}
              </Button>
            </div>
            {status && <p className="mt-2 text-sm text-gray-600">{status}</p>}
          </div>
        </div>

        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold">Downloads</h2>
              <p className="text-sm text-gray-600">
                Videos you downloaded are recorded here for quick access.
              </p>
            </div>
            <div>
              <a
                href="/downloads"
                className="inline-flex items-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Go to downloads page
              </a>
            </div>
          </div>
          <DownloadsContent />
        </section>
      </div>
    </main>
  );
};

export default Profile;
