import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OnlinePlayersCount {
  total: number;
  browsing: number;
  selecting: number;
  playing: number;
  byGame: Record<string, number>;
  byBetLevel: Record<string, Record<number, number>>;
}

export const useOnlinePlayers = (refreshInterval: number = 30000) => {
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayersCount>({
    total: 0,
    browsing: 0,
    selecting: 0,
    playing: 0,
    byGame: {},
    byBetLevel: {}
  });
  const [loading, setLoading] = useState(true);

  const fetchOnlinePlayers = async () => {
    try {
      const { data: summaryData } = await supabase
        .from('online_players_summary')
        .select('*')
        .single();

      const { data: gameData } = await supabase
        .from('players_per_game')
        .select('*');

      const { data: betLevelData } = await supabase
        .from('players_per_bet_level')
        .select('*');

      const byGame: Record<string, number> = {};
      gameData?.forEach((row: any) => {
        if (row.current_game_id) {
          byGame[row.current_game_id] = Number(row.player_count) || 0;
        }
      });

      const byBetLevel: Record<string, Record<number, number>> = {};
      betLevelData?.forEach((row: any) => {
        if (row.current_game_id) {
          if (!byBetLevel[row.current_game_id]) {
            byBetLevel[row.current_game_id] = {};
          }
          if (row.current_bet_amount) {
            byBetLevel[row.current_game_id][Number(row.current_bet_amount)] =
              Number(row.player_count) || 0;
          }
        }
      });

      setOnlinePlayers({
        total: Number(summaryData?.total_online) || 0,
        browsing: Number(summaryData?.browsing_games) || 0,
        selecting: Number(summaryData?.selecting_bet) || 0,
        playing: Number(summaryData?.currently_playing) || 0,
        byGame,
        byBetLevel
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching online players:', error);
      setOnlinePlayers({
        total: 0,
        browsing: 0,
        selecting: 0,
        playing: 0,
        byGame: {},
        byBetLevel: {}
      });
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
          console.log('🔄 Presence updated - refreshing player counts');
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
