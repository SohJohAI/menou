"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient"; // ←ここパス合ってるか確認！
import { Session } from "@supabase/supabase-js";

export default function AuthButton() {
  const [session, setSession] = useState<Session | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ログイン状態の監視
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      {/* 右上のボタン本体 */}
      {session ? (
        <div className="fixed top-4 right-4 z-50 flex items-center space-x-2 bg-white/80 backdrop-blur p-2 rounded-lg shadow-sm">
          <span className="text-gray-700 text-sm font-medium">
            {session.user?.email}
          </span>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-2 px-3 rounded transition-colors"
          >
            ログアウト
          </button>
        </div>
      ) : (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full shadow-lg transition-all hover:scale-105"
          >
            ログイン / 登録
          </button>
        </div>
      )}

      {/* 認証モーダル (isModalOpenの時だけ表示) */}
      {isModalOpen && (
        <AuthModal onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
}

// ▼▼▼ サブコンポーネント: モーダル本体 ▼▼▼
function AuthModal({ onClose }: { onClose: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    setLoading(true);
    setMessage("");
    
    try {
      if (isLogin) {
        // ログイン処理
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // 成功したら閉じる
        onClose();
      } else {
        // 新規登録処理
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("確認メールを送信しました！メール内のリンクを踏んでください。");
      }
    } catch (error: any) {
      setMessage(error.message || "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in duration-200">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          {isLogin ? "おかえりなさい" : "アカウント作成"}
        </h2>
        
        <div className="space-y-4">
          <input
            type="email"
            placeholder="メールアドレス"
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-gray-800"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="パスワード"
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-gray-800"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {message && (
          <p className="text-sm text-red-500 mt-4 text-center bg-red-50 p-2 rounded">
            {message}
          </p>
        )}

        <button
          onClick={handleAuth}
          disabled={loading}
          className="w-full mt-6 bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? "処理中..." : (isLogin ? "ログイン" : "登録する")}
        </button>

        <div className="mt-4 flex justify-between text-sm">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 hover:underline font-medium"
          >
            {isLogin ? "新規登録はこちら" : "ログインはこちら"}
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}