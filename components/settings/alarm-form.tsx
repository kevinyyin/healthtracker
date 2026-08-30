"use client";

import { useState, useTransition } from "react";
import { saveAlarm, savePushSubscription } from "@/lib/actions/alarm";
import { env } from "@/lib/env";

interface AlarmFormProps {
  initialAlarm: { enabled: boolean; wakeFrom: string; wakeTo: string } | null;
  subscriptionCount: number;
}

type PushStatus = "idle" | "requesting" | "subscribed" | "denied" | "unsupported";

export function AlarmForm({ initialAlarm, subscriptionCount }: AlarmFormProps) {
  const [enabled, setEnabled] = useState(initialAlarm?.enabled ?? false);
  const [wakeFrom, setWakeFrom] = useState(initialAlarm?.wakeFrom.slice(0, 5) ?? "06:30");
  const [wakeTo, setWakeTo] = useState(initialAlarm?.wakeTo.slice(0, 5) ?? "07:00");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [pushStatus, setPushStatus] = useState<PushStatus>(subscriptionCount > 0 ? "subscribed" : "idle");
  const [pushError, setPushError] = useState<string | null>(null);

  function handleSave() {
    if (!wakeFrom || !wakeTo) return;
    setError(null);
    startTransition(async () => {
      try {
        await saveAlarm({ enabled, wakeFrom, wakeTo });
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save.");
      }
    });
  }

  async function handleEnablePush() {
    setPushError(null);

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushStatus("unsupported");
      return;
    }

    setPushStatus("requesting");
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus("denied");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      });
      const { endpoint, keys } = subscription.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      await savePushSubscription({ endpoint, p256dh: keys.p256dh, auth: keys.auth });
      setPushStatus("subscribed");
    } catch (e) {
      setPushError(e instanceof Error ? e.message : "Failed to enable notifications.");
      setPushStatus("idle");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 text-sm">
        Alarm
        <div className="flex gap-1">
          <EnabledToggle
            label="On"
            active={enabled}
            onClick={() => {
              setEnabled(true);
              setSaved(false);
            }}
          />
          <EnabledToggle
            label="Off"
            active={!enabled}
            onClick={() => {
              setEnabled(false);
              setSaved(false);
            }}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Wake from
          <input
            type="time"
            value={wakeFrom}
            onChange={(e) => {
              setWakeFrom(e.target.value);
              setSaved(false);
            }}
            className="field"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Wake by
          <input
            type="time"
            value={wakeTo}
            onChange={(e) => {
              setWakeTo(e.target.value);
              setSaved(false);
            }}
            className="field"
          />
        </label>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button type="button" onClick={handleSave} disabled={isPending || !wakeFrom || !wakeTo} className="btn btn-primary w-fit">
        {isPending ? "Saving..." : saved ? "Saved" : "Save"}
      </button>

      <div className="mt-2 flex flex-col gap-2 border-t border-[var(--border)] pt-3">
        <p className="text-sm">
          {pushStatus === "subscribed"
            ? `Notifications enabled (${subscriptionCount} device${subscriptionCount === 1 ? "" : "s"}).`
            : "Notifications aren't enabled on this device yet."}
        </p>

        {pushStatus !== "subscribed" && (
          <button type="button" onClick={handleEnablePush} disabled={pushStatus === "requesting"} className="btn btn-outline w-fit">
            {pushStatus === "requesting" ? "Requesting..." : "Enable notifications on this device"}
          </button>
        )}

        {pushStatus === "denied" && (
          <p className="text-xs text-danger">
            Notification permission was denied. Enable it for this site in your browser settings to use Smart Alarm.
          </p>
        )}
        {pushStatus === "unsupported" && (
          <p className="text-xs text-danger">
            This browser doesn&apos;t support push notifications. On iPhone, add this app to your Home Screen first
            (Share &gt; Add to Home Screen), then open it from there and try again — Safari doesn&apos;t support push
            from a regular browser tab.
          </p>
        )}
        {pushError && <p className="text-xs text-danger">{pushError}</p>}

        <p className="text-xs text-foreground/50">
          The alarm currently fires at the start of your wake window, not yet at a predicted optimal moment within
          it.
        </p>
      </div>
    </div>
  );
}

function EnabledToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`chip ${active ? "chip-active" : ""}`}>
      {label}
    </button>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
