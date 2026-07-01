import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfile } from "@/lib/nova.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const [name, setName] = useState("");
  const [tz, setTz] = useState("");

  useEffect(() => {
    if (profile.data) {
      setName(profile.data.display_name ?? "");
      setTz(profile.data.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
  }, [profile.data]);

  const save = useMutation({
    mutationFn: () => updateProfile({ data: { display_name: name, timezone: tz } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile"] }); toast.success("Saved"); },
  });

  return (
    <div className="mx-auto max-w-2xl px-8 py-10">
      <h1 className="font-display text-3xl">Settings</h1>
      <p className="mt-1 text-muted-foreground">A few personal touches for Nova.</p>

      <Card className="mt-8 space-y-4 p-6">
        <div><Label>Display name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="What should Nova call you?" /></div>
        <div><Label>Timezone</Label>
          <Input value={tz} onChange={(e) => setTz(e.target.value)} /></div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
      </Card>
    </div>
  );
}
