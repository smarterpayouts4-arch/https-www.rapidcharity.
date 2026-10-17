import { DemoUnlock } from "@/components/apply/DemoUnlock";

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <DemoUnlock />
    </>
  );
}
