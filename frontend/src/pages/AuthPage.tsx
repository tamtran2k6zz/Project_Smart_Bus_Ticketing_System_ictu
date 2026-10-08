import { AuthForm } from '@/features/auth/components/AuthForm';
export default function AuthPage({ mode }: { mode: 'login' | 'register' | 'forgot' }) {
  return <AuthForm mode={mode} />;
}
