import type { Metadata } from "next";
import { ApplicationScreen } from "@/components/apply/ApplicationScreen";
import { isScholarshipId } from "@/lib/application/constants";
import { mockApplicationsEnabled } from "@/lib/application/mockGate";
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
  const rawMock = params?.mock;
  const mock = mockApplicationsEnabled() ? findMock(Array.isArray(rawMock) ? rawMock[0] : rawMock) : undefined;
  const initialScholarship = mock ? mock.scholarship : isScholarshipId(value) ? value : "";
  return <ApplicationScreen initialScholarship={initialScholarship} initialMock={mock?.id ?? ""} />;
}
