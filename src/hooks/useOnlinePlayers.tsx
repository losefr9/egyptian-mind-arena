import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OnlinePlayersCount {
  total: number;
  byGame: Record<string, number>;
  byBetLevel: Record<string, Record<number, number>>;
}

export const useOnlinePlayers = (refreshInterval: number = 300000) => {
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayersCount>({
    total: 0,
    byGame: {},
    byBetLevel: {}
  });
  const [loading, setLoading] = useState(true);

  const fetchOnlinePlayers = async () => {
    try {
      const { count: totalOnline } = await supabase
        .from('user_presence')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'online')
        .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      const { data: presenceData } = await supabase
        .from('user_presence')
        .select('user_id, current_game_id, current_bet_amount, status, last_seen')
        .eq('status', 'online')
        .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      const byGame: Record<string, number> = {};
      const byBetLevel: Record<string, Record<number, number>> = {};

      presenceData?.forEach((presence) => {
        if (presence.current_game_id) {
          byGame[presence.current_game_id] = (byGame[presence.current_game_id] || 0) + 1;

          if (!byBetLevel[presence.current_game_id]) {
            byBetLevel[presence.current_game_id] = {};
          }

          if (presence.current_bet_amount) {
            const betAmount = Number(presence.current_bet_amount);
            byBetLevel[presence.current_game_id][betAmount] =
              (byBetLevel[presence.current_game_id][betAmount] || 0) + 1;
          }
        }
      });

      setOnlinePlayers({
        total: totalOnline || 0,
        byGame,
        byBetLevel
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching online players:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnlinePlayers();

    const interval = setInterval(() => {
      fetchOnlinePlayers();
    }, refreshInterval);

    const channel = supabase
      .channel('online-players-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence'
        },
        () => {
          fetchOnlinePlayers();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [refreshInterval]);

  return { onlinePlayers, loading, refresh: fetchOnlinePlayers };
};
