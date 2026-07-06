import "./globals.css";

export const metadata = {
  title: "AHNi Health Financing Situation Analysis",
  description: "Health Financing & Domestic Resource Mobilization Situation Analysis — GHSD Transition Readiness Assessment",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
