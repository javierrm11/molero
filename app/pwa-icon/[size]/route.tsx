import { appIcon } from "@/lib/icon-image";

const SIZES = ["192", "512"];

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return SIZES.map((size) => ({ size }));
}

export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  return appIcon(Number(size));
}
