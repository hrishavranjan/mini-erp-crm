export default function Footer() {
  return (
    <footer
      style={{
        textAlign: "center",
        padding: "18px 16px",
        fontSize: "12.5px",
        color: "var(--text-muted)",
      }}
    >
      Mini ERP + CRM Operations Portal &copy; {new Date().getFullYear()} &nbsp;•&nbsp; Designed &amp;
      Developed by <strong style={{ color: "var(--text-secondary)" }}>Hrishav Ranjan</strong>
    </footer>
  );
}
