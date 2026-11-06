import Report from "./Report";

export const metadata = { title: "Your Longevity Combine results · Groove" };
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <Report code={code.toUpperCase()} />;
}
