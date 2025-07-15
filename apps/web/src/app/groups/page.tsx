import Header from "@/components/Header";
import GroupDashboard from "@/components/dashboard/GroupDashboard";

// TODO: Replace with real user ID from auth context
const MOCK_USER_ID = "mock-user-id";

export default function GroupsPage() {
  return (
    <main className="bg-[#EDEDED] min-h-screen">
      <Header />
      <GroupDashboard userId={MOCK_USER_ID} />
    </main>
  );
} 