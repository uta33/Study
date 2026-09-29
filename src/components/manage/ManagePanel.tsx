import type { User } from "firebase/auth";
import AccuracyCard from "./AccuracyCard";
import Chart14 from "./Chart14";
import LogList from "./LogList";
import RecordCard from "./RecordCard";
import SettingsCard from "./SettingsCard";
import TasksCard from "./TasksCard";
import WeekCard from "./WeekCard";

export default function ManagePanel({ user }: { user: User | null }) {
  return (
    <main className="panel" aria-label="管理">
      <WeekCard />
      <RecordCard />
      <Chart14 />
      <div className="grid2">
        <TasksCard />
        <AccuracyCard />
      </div>
      <LogList />
      <SettingsCard user={user} />
    </main>
  );
}
