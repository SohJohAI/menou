import { supabase } from './supabaseClient'; // パスが '../lib/supabase' の場合は調整してくれ

export const saveMindMap = async (userId: string, nodes: any[], edges: any[]) => {
  console.log("Attempting to save for user:", userId);

  try {
    const mapData = {
      nodes: nodes,
      edges: edges,
    };

    // user_mindmaps テーブルに保存
    // 重要: カラム名は 'flow_data'
    const { data, error } = await supabase
      .from('user_mindmaps')
      .upsert({ 
        user_id: userId,
        flow_data: mapData, 
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' }) // user_id が重複したら更新する設定
      .select();

    if (error) {
      console.error("Supabase Save Error Details:", error);
      throw error;
    }

    console.log('✅ Save successful:', data);
    return data;

  } catch (error) {
    console.error('❌ Error saving mindmap:', error);
  }
};

export const fetchMindMap = async (userId: string) => {
  console.log("Fetching data for user:", userId);

  try {
    const { data, error } = await supabase
      .from('user_mindmaps')
      .select('flow_data')
      .eq('user_id', userId)
      .single(); // 1件だけ取得

    if (error) {
      // データがまだない場合はエラーではなく「空」として扱う
      if (error.code === 'PGRST116') {
        console.log("No data found for this user (New user).");
        return null;
      }
      console.error("Supabase Fetch Error Details:", error);
      throw error;
    }

    console.log('✅ Fetch successful:', data);
    return data;

  } catch (error) {
    console.error('❌ Error fetching mindmap:', error);
    return null;
  }
};