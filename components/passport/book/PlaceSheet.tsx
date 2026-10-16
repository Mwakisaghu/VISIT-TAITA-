"use client";

import { useState } from "react";
import { StampArt } from "@/components/passport/book/Art";
import { zoneText } from "@/components/passport/book/PassportPages";
import type { Tr } from "@/components/passport/book/types";
import { checkInWithLocation, type CheckinResult } from "@/lib/actions/passport";
import type { Locale } from "@/lib/i18n/config";
import { CHECKIN_POINTS } from "@/lib/passport-constants";
import { distanceText, longDate, metres, zoneOf, type PassportPlace } from "@/lib/passport-book";

type Outcome = { code: string; distanceM?: number };
/** One place's sheet: what it is, and the one thing to do next (stamp it, or scan its plaque), with a quiet second choice. */
export default function PlaceSheet({ place, tr, locale, onClose, onStamped, onMark, onUnmark }: {
  place: PassportPlace; tr: Tr; locale: Locale; onClose: () => void;
  onStamped: (res: CheckinResult, place: PassportPlace) => void; onMark: (place: PassportPlace) => void; onUnmark: (place: PassportPlace) => void;
}) {
  const [busy, setBusy] = useState(false); const [out, setOut] = useState<Outcome | null>(null);
  const zone = zoneOf(place.altitudeM); const zt = zoneText(zone, tr);

  const say = (o: Outcome): string => {
    switch (o.code) {
      case "sign_in": return tr("Please sign in to check in.");
      case "too_many": return tr("Too many check-in attempts. Please wait a few minutes and try again.");
      case "bad_location": return tr("We couldn't read your location. Please try again.");
      case "imprecise": return tr("Your location isn't precise enough yet. Step outside or into the open and try again.");
      case "unavailable": return tr("This place isn't available for check-in.");
      case "no_location": return tr("This place can only be stamped with its QR code. Scan the plaque when you are there.");
      case "too_far": return tr("You're about {distance} away. Get closer and try again.", { distance: distanceText(o.distanceM ?? 0, locale) });
      case "no_geo": return tr("Your browser can't share its location. Scan the QR code at the site instead.");
      case "denied": return tr("Location access was denied. Allow it in your browser settings, or scan the QR code at the site.");
      case "no_fix": return tr("We couldn't get your location. Try again outdoors, or scan the QR code at the site.");
      default: return tr("Something went wrong checking you in. Please try again.");
    }
  };

  function stamp() {
    setOut(null);
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) { setOut({ code: "no_geo" }); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await checkInWithLocation(place.id, pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
          if (res.success) onStamped(res, place); else setOut({ code: res.code ?? "failed", distanceM: res.distanceM });
        } catch { setOut({ code: "failed" }); } finally { setBusy(false); }
      },
      (err) => { setBusy(false); setOut({ code: err.code === err.PERMISSION_DENIED ? "denied" : "no_fix" }); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  const where = [place.region, place.altitudeM !== null ? metres(place.altitudeM, locale) : null, zt.label].filter(Boolean).join(" · ");
  return (
    <div className="pp-dlg-body">
      <span className={`pp-stamp pp-stamp-lg pp-z-${zone}`} style={{ ["--pp-r" as string]: "-3deg" }}><StampArt place={place} locale={locale} tr={tr} uid="dlg" /></span>
      <h2 id="pp-dlg-title">{place.name}</h2>
      <p className="pp-where">{where}</p>
      {place.state === "stamped" ? (
        <>
          <p className="pp-center"><span className="pp-chip pp-good">{tr("Stamped")}</span></p>
          <p className="pp-center">{tr("Stamped on {date}, checked in with {how}.", { date: place.visitedAt ? longDate(place.visitedAt, locale) : "", how: place.method === "QR" ? tr("a QR code") : tr("your location") })}</p>
          <p className="pp-center pp-fine">{tr("Each place earns {n} points the first time you stamp it.", { n: CHECKIN_POINTS })}</p>
          <div className="pp-actions"><button type="button" className="pp-cta pp-cta-2" onClick={onClose}>{tr("Close")}</button></div>
        </>
      ) : (
        <>
          {place.state === "marked"
            ? (<><p className="pp-center"><span className="pp-chip">{tr("Marked as visited · no points")}</span></p><p>{tr("You marked this place as visited. Check in when you are there to turn it into a stamp with its date, and earn {n} points.", { n: CHECKIN_POINTS })}</p></>)
            : <p>{tr("Earn {n} points and a dated stamp the first time you check in here.", { n: CHECKIN_POINTS })}</p>}
          <div className="pp-actions">
            {place.canLocate ? (
              <>
                <p className="pp-fine">{tr("We use your location once, only to check you are close. We do not store it.")} {tr("You need to be within about {m} m.", { m: place.radiusM })}</p>
                <button type="button" className="pp-cta" onClick={stamp} disabled={busy} aria-describedby={out ? "pp-dlg-msg" : undefined}>{busy ? tr("Locating…") : tr("Stamp my passport")}</button>
              </>
            ) : <p className="pp-fine">{tr("This place has a QR plaque. Scan it with your phone's camera when you are there to stamp your passport.")}</p>}
            {out && <p id="pp-dlg-msg" role="alert" className="pp-msg">{say(out)}</p>}
            {place.state === "marked"
              ? <button type="button" className="pp-link" onClick={() => onUnmark(place)}>{tr("Remove my mark")}</button>
              : <button type="button" className="pp-link" onClick={() => onMark(place)}>{tr("Just mark as visited (no points)")}</button>}
            <button type="button" className="pp-cta pp-cta-2" onClick={onClose}>{tr("Not now")}</button>
          </div>
        </>
      )}
    </div>
  );
}
