import type { Metadata } from "next";
import { ApplicationScreen } from "@/components/apply/ApplicationScreen";
import { isScholarshipId } from "@/lib/application/constants";
import { sampleModeAllowed } from "@/lib/application/mockGate";
import { findMock } from "@/lib/application/mocks";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Scholarship application",
  alternates: { canonical: `${site.url}/apply/form` },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ApplicationPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = searchParams ? await searchParams : undefined;
  const raw = params?.scholarship;
  const value = Array.isArray(raw) ? raw[0] : raw;
  // Sample mode: env gate, or ?demo=<key> on this request. A browser that unlocked
  // earlier and comes back without the parameter fetches the samples itself.
  const sampleMode = sampleModeAllowed(params?.demo);
  const mock = sampleMode ? findMock(params?.mock) : undefined;
  const initialScholarship = mock ? mock.scholarship : isScholarshipId(value) ? value : "";
  return <ApplicationScreen initialScholarship={initialScholarship} initialMock={mock?.id ?? ""} sampleMode={sampleMode} />;
}
