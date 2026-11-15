export const metadata = { title: "Privacy Policy — OSINT Atlas" };

// PLACEHOLDER. Have a lawyer review before public launch. Must stay in sync
// with what the app actually collects (currently: camera-submission form).
export default function Privacy() {
  return (
    <main style={{ maxWidth: 760, margin: "40px auto", padding: "0 20px",
      fontFamily: "system-ui", lineHeight: 1.7 }}>
      <h1>Privacy Policy</h1>
      <p><em>Draft — pending legal review. Last updated: {new Date().toISOString().slice(0,10)}.</em></p>

      <h2>Who we are</h2>
      <p>OSINT Atlas is operated by Sitelytc Digital Media Pvt. Ltd., Nihal Vihar,
      New Delhi, India. Grievance contact: <a href="mailto:privacy@sitelytc.com">privacy@sitelytc.com</a>.</p>

      <h2>What we collect</h2>
      <ul>
        <li><b>Camera submissions:</b> property name, type, city/country, coordinates,
          a camera URL, and a contact email — provided voluntarily by the property
          owner who submits a camera.</li>
        <li>We do <b>not</b> run advertising trackers or profiling on this site.</li>
      </ul>

      <h2>Why, and for how long</h2>
      <p>Submission data is used solely to verify ownership and list a consenting
      camera. Pending submissions that are not approved are deleted on review.</p>

      <h2>Your rights (DPDP Act, 2023)</h2>
      <p>You may request access, correction, or deletion of your data, or withdraw
      consent, by emailing the grievance contact above.</p>

      <h2>What this service shows</h2>
      <p>The map aggregates only publicly published feeds (e.g. transport-authority
      cameras) and openly broadcast data (aircraft, vessels, seismic and natural-event
      feeds). It does not provide access to private or unsecured camera systems, and
      it does not profile individuals.</p>
    </main>
  );
}
