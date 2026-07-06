import "./globals.css";

export const metadata = {
  title: "AHNi Health Financing Situation Analysis",
  description: "Health Financing & Domestic Resource Mobilization Situation Analysis — GHSD Transition Readiness Assessment",
};

// Without this, the CSS media queries (mobile nav, single-column grids, etc.)
// never activate on phones — the page renders at desktop width and zooms out.
export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
