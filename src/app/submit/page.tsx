"use client";
import { useState } from "react";

const TYPES = ["hotel", "hostel", "university", "business", "other"];

export default function SubmitPage() {
  const [msg, setMsg] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!f.get("owner_attested")) { setMsg("Please confirm you own/operate this property."); return; }
    setBusy(true); setMsg("");
    const body = {
      property_name: f.get("property_name"), property_type: f.get("property_type"),
      city: f.get("city"), country: f.get("country"), contact_email: f.get("contact_email"),
      lat: Number(f.get("lat")), lon: Number(f.get("lon")),
      image_url: f.get("image_url") || "", stream_url: f.get("stream_url") || "",
      owner_attested: true,
    };
    const r = await fetch("/api/submit", { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json(); setBusy(false);
    setMsg(r.ok ? "✓ " + d.message : "Error: " + (d.error || "failed"));
    if (r.ok) (e.target as HTMLFormElement).reset();
  }

  const inp = { width: "100%", padding: "9px 11px", margin: "4px 0 12px", background: "#131c2b",
    border: "1px solid #1e2a3d", borderRadius: 8, color: "#dfe7f2", fontSize: 14 } as const;

  return (
    <main style={{ maxWidth: 560, margin: "40px auto", padding: "0 20px",
      fontFamily: "system-ui", color: "#dfe7f2" }}>
      <h1 style={{ fontSize: 22 }}>List your camera on OSINT Atlas</h1>
      <p style={{ color: "#8396b0", fontSize: 14, lineHeight: 1.6 }}>
        Only the owner or operator of a property may submit its public-facing
        camera (e.g. a lobby, gate, or street view). We review every submission
        before it goes live. Do not submit a camera you do not own.
      </p>
      <form onSubmit={onSubmit}>
        <label>Property name<input style={inp} name="property_name" required /></label>
        <label>Type
          <select style={inp} name="property_type" required defaultValue="hotel">
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <div style={{ display: "flex", gap: 12 }}>
          <label style={{ flex: 1 }}>City<input style={inp} name="city" /></label>
          <label style={{ width: 110 }}>Country<input style={inp} name="country" placeholder="IN" /></label>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <label style={{ flex: 1 }}>Latitude<input style={inp} name="lat" type="number" step="any" required /></label>
          <label style={{ flex: 1 }}>Longitude<input style={inp} name="lon" type="number" step="any" required /></label>
        </div>
        <label>Image URL (still)<input style={inp} name="image_url" placeholder="https://…/snapshot.jpg" /></label>
        <label>Stream URL (optional)<input style={inp} name="stream_url" placeholder="https://…/stream.m3u8" /></label>
        <label>Contact email<input style={inp} name="contact_email" type="email" required /></label>
        <label style={{ display: "flex", gap: 8, fontSize: 13, color: "#8396b0", margin: "4px 0 16px" }}>
          <input type="checkbox" name="owner_attested" />
          I confirm I own or operate this property and consent to this camera being shown publicly.
        </label>
        <button disabled={busy} style={{ padding: "10px 18px", background: "#38bdf8",
          border: 0, borderRadius: 8, color: "#06121f", fontWeight: 600, cursor: "pointer" }}>
          {busy ? "Submitting…" : "Submit for review"}
        </button>
      </form>
      {msg && <p style={{ marginTop: 16, fontSize: 14 }}>{msg}</p>}
    </main>
  );
}
