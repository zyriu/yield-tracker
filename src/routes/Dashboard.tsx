import PortfolioSummaryCard from "@/components/PortfolioSummaryCard";
import PositionsTable from "@/components/PositionsTable";

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 mt-6">
      {/* Display the overall portfolio summary above the positions table */}
      <PortfolioSummaryCard />
      <PositionsTable />
    </div>
  );
}
