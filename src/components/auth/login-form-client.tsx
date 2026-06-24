'use client';

import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showLoginError } from '@/lib/toast-messages';
import { SubmitButton } from './submit-button';
import { getAuthToken } from '@/server/services/graphql-service';
import { useEffect, useState } from 'react';
import { AdminHoverCard } from './login-hover-client';

const REMEMBERED_LOGIN_KEY = 'certif-manager:remembered-login';

export function LoginFormClient() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [rememberLogin, setRememberLogin] = useState(false);

  useEffect(() => {
    const savedLogin = localStorage.getItem(REMEMBERED_LOGIN_KEY);

    if (savedLogin) {
      setUsername(savedLogin);
      setRememberLogin(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const usernameValue = String(formData.get('login'));

    if (rememberLogin) {
      window.localStorage.setItem(REMEMBERED_LOGIN_KEY, usernameValue);
    } else {
      window.localStorage.removeItem(REMEMBERED_LOGIN_KEY);
    }

    const login = String(formData.get('login'));
    const password = String(formData.get('password'));

    const token = await getAuthToken(login, password);
    
    if (!token.success) {
      showLoginError(token);
      return;
    }

    router.push('/');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="login">Логин AD</Label>
        <Input
          id="login"
          name="login"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="LoginAD"
          autoComplete="username"
          className="h-11 bg-white"
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="password">Пароль</Label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground">
            <input
              type="checkbox"
              name="rememberMe"
              checked={rememberLogin}
              onChange={(e) => setRememberLogin(e.target.checked)}
              className="accent-primary cursor-pointer"
            />
            Запомнить меня?
          </label>
    
        </div>

        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Введите пароль"
          autoComplete="current-password"
          className="h-11 bg-white"
          required
        />
      </div>
      
      <SubmitButton />
      <AdminHoverCard/>
    </form>
  );
}