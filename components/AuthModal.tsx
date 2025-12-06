'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleAuth = async () => {
    setMessage('');
    if (isLogin) {
      // Login
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
      } else {
        setMessage('ログインしました！');
        onClose();
      }
    } else {
      // Register
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage(error.message);
      } else {
        setMessage('登録しました！確認メールをチェックしてください。');
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">
          {isLogin ? 'ログイン' : '新規登録'}
        </h2>
        <input
          type="email"
          placeholder="メールアドレス"
          className="w-full p-2 mb-3 border border-gray-300 rounded-md text-gray-800"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="パスワード"
          className="w-full p-2 mb-4 border border-gray-300 rounded-md text-gray-800"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {message && <p className="text-sm text-red-500 mb-4 text-center">{message}</p>}
        <button
          onClick={handleAuth}
          className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition duration-200"
        >
          {isLogin ? 'ログイン' : '登録'}
        </button>
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-3 text-blue-600 hover:underline text-sm"
        >
          {isLogin ? '新規登録はこちら' : 'ログインはこちら'}
        </button>
        <button
          onClick={onClose}
          className="w-full mt-4 text-gray-500 hover:underline text-sm"
        >
          閉じる
        </button>
      </div>
    </div>
  );
};

export default AuthModal;
