import Board from "./Board";

// Board-only manifest: "Install app" on the display's Chrome opens /board full screen, with no address bar.
export const metadata = { title: "Longevity Combine leaderboard · Groove", manifest: "/board.webmanifest" };
export const viewport = { themeColor: "#062330" };
export default function Page() {
  return <Board />;
}
