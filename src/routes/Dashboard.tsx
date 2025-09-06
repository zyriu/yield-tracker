import PortfolioSummaryCard from "@/components/PortfolioSummaryCard";
import PositionsTable from "@/components/PositionsTable";

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-screen-2xl space-y-6 mt-6">
      <PortfolioSummaryCard />
      <PositionsTable />
    </div>
  );
}
