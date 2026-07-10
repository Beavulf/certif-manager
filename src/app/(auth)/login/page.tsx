import { LoginForm } from '@/components/auth/login-form';
import { getSessionUser } from '@/lib/session-helper';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Вход в систему',
};

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) {
    redirect('/');
  }

  return <LoginForm />;
}
