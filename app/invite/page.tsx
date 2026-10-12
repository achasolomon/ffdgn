import type { Metadata } from "next";
import { ConferenceGuestInvitation } from "@/components/conference-guest-invitation";
export const metadata: Metadata = { title: "Your invitation", description: "View your private conference invitation and respond to the Secretariat.", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function InvitationPage() { return <ConferenceGuestInvitation />; }
export const dynamic = "force-dynamic";
