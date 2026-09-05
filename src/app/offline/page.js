import { Logo } from "@/components/Logo";
import { Card } from "@/components/Card";

export const metadata = { title: "You're offline" };

// Served by the service worker when a navigation fails with no network (see
// next.config.mjs). Vitaura is installable, so this is a screen real users
// will hit — on the bus, in a clinic waiting room — and it needs to explain
// what still works rather than just saying "no connection".
export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-16 sm:max-w-xl sm:px-8">
      <Logo className="mb-8" />
      <p className="label-tracked mb-2 text-xs text-caution">Offline</p>
      <h1 className="font-display mb-2 text-2xl font-semibold sm:text-3xl">
        You&apos;re not connected
      </h1>
      <p className="mb-6 text-sm leading-relaxed text-muted">
        Vitaura checks claims against trusted sources in real time, so it needs a connection
        to verify anything new.
      </p>
      <Card>
        <p className="mb-3 text-sm leading-relaxed">While you&apos;re offline:</p>
        <ul className="flex flex-col gap-2 text-sm leading-relaxed text-muted">
          <li>• Results you&apos;ve already opened stay available.</li>
          <li>• Your risk portfolio and history are stored on this device.</li>
          <li>• New checks will work as soon as you reconnect.</li>
        </ul>
      </Card>
      <p className="mt-6 text-center text-[11px] leading-relaxed text-faint">
        Don&apos;t act on a health claim you couldn&apos;t verify. When in doubt, ask a
        clinician.
      </p>
    </main>
  );
}
