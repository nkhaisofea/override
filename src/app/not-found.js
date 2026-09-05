import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Card, PillButton } from "@/components/Card";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-16 sm:max-w-xl sm:px-8">
      <Logo href="/" className="mb-8" />
      <p className="label-tracked mb-2 text-xs text-muted">404</p>
      <h1 className="font-display mb-2 text-2xl font-semibold sm:text-3xl">
        This page doesn&apos;t exist
      </h1>
      <p className="mb-6 text-sm leading-relaxed text-muted">
        The link may be mistyped or the result may have been removed.
      </p>
      <Card className="mb-6">
        <p className="text-sm leading-relaxed">
          If you were sent a claim to check, paste it on the home screen and Vitaura will
          verify it against trusted sources.
        </p>
      </Card>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/" className="flex-1">
          <PillButton className="w-full">Check a claim</PillButton>
        </Link>
        <Link href="/faq" className="flex-1">
          <PillButton variant="outline" className="w-full">
            Browse health FAQs
          </PillButton>
        </Link>
      </div>
    </main>
  );
}
