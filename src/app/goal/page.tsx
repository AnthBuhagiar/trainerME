import { GoalForm } from "@/components/GoalForm";
import { loadRides } from "@/lib/data/store";
import { todayLocal } from "@/lib/engine/dates";
import { buildHistory } from "@/lib/engine/history";
import { buildModel } from "@/lib/engine/hourPower";
import { activeGoal, loadGoals } from "@/lib/goals/model";

export const dynamic = "force-dynamic";

export default function GoalPage() {
  const rides = loadRides();
  const current = rides.length ? buildHistory(buildModel(rides), todayLocal()).current : null;
  const goal = activeGoal(todayLocal()) ?? loadGoals().at(-1) ?? null;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-5 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="display text-[24px]">{goal ? "Your goal" : "Set a goal"}</h1>
        <p className="text-[15px] text-muted">The plan is built backwards from this date: base, build, event-specific, then a two-week taper.</p>
      </header>
      <GoalForm goal={goal} hourPower={current ? Math.round(current.hourPower) : null} />
    </main>
  );
}
