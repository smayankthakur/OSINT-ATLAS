export const metadata = { title: "Terms of Service — OSINT Atlas" };

// PLACEHOLDER. Have a lawyer review before public launch.
export default function Terms() {
  return (
    <main style={{ maxWidth: 760, margin: "40px auto", padding: "0 20px",
      fontFamily: "system-ui", lineHeight: 1.7 }}>
      <h1>Terms of Service</h1>
      <p><em>Draft — pending legal review.</em></p>
      <h2>Acceptable use</h2>
      <p>You may use OSINT Atlas to view publicly published data. You may not use it
      to harass, surveil, or profile any individual, or to attempt access to any
      non-public system.</p>
      <h2>Camera submissions</h2>
      <p>By submitting a camera you confirm you own or operate the property and
      consent to it being shown publicly. We may remove any listing at our discretion.</p>
      <h2>No warranty & liability</h2>
      <p>Data is provided “as is” from third-party public sources, without warranty.</p>
      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India; courts at Delhi have jurisdiction.</p>
      <h2>Contact</h2>
      <p>Sitelytc Digital Media Pvt. Ltd. — <a href="mailto:legal@sitelytc.com">legal@sitelytc.com</a></p>
    </main>
  );
}
