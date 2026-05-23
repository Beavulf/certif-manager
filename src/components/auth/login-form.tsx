import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LoginFormClient } from './login-form-client';

export function LoginForm() {

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground drop-shadow-[0_2px_8px_rgba(0,0,0,0.16)]">
          Certificate Manager
        </h1>
      </div>
      <Card className="border-border/70 bg-card shadow-[0_14px_40px_rgba(15,23,42,0.06)]">

      <CardHeader className="space-y-3 flex flex-col items-center text-center">
        <div className="space-y-1">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Вход в систему
          </CardTitle>
          <CardDescription className="text-sm leading-6">
            Управляй сертификатами, сроками действия и загруженными файлами в одном месте.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <LoginFormClient/>
      </CardContent>
      </Card>
    </div>
  );
}