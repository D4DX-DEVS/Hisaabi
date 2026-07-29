import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/adminApi';
import LeaderboardTable from '../components/LeaderboardTable';
import { CheckCircle2 } from 'lucide-react';

export default function QuranProgressPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['model-quran-progress'],
    queryFn: () => adminApi.getQuranProgressStats().then((r) => r.data),
  });

  return (
    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 gap-6">
      <LeaderboardTable
        title="Quran Progress (Khatms)"
        description="Users ranked by number of full Quran completions"
        isLoading={isLoading}
        rows={data?.leaderboard || []}
        scoreLabel="Khatms Completed"
        scoreKey="khatms_completed"
        icon={CheckCircle2}
      />
    </div>
  );
}
