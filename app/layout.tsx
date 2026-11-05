export const metadata = { title: "The Longevity Combine" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F4F2EC", color: "#0F4258" }}>{children}</body></html>);
}
