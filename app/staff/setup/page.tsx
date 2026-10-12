import { ConferenceStaffSetup } from "@/components/conference-staff-setup";
export const metadata = { title: "Create your staff password", robots: { index: false, follow: false } };
export default function StaffSetupPage() { return <div className="min-h-screen bg-gray-50 px-4 py-8 sm:py-16"><ConferenceStaffSetup /></div>; }
