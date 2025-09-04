import PositionsTable from "@/components/PositionsTable";

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-7xl p-4">
      <PositionsTable />
      {/* Reserved space for future analytics cards */}
    </div>
  );
}
