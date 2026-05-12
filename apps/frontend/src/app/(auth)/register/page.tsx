import Image from 'next/image';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { Navbar } from '@/components/shared/Navbar';
import { SiteFooter } from '@/components/shared/SiteFooter';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30]">
      <Navbar />
      <main className="mx-auto flex w-full max-w-[1280px] flex-1 items-center px-4 py-10 md:px-8">
        <div className="grid w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-2">
          <div className="relative hidden min-h-[720px] lg:block">
            <Image
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBKFmxWTsbj_rkQxLnGxLTppX1pP6xto_778YGxL_NROcxI2Uy28ywCSIdNHSQHGUJLceGuZfDSgPCnJOUAHD5Fjd84JQpVuPm5RfZs6dULWUQ16-LFOt1jamO6oeZZsMQcHXs6q7m3PQkxmDV9InqJSJDo5Rw97FMv9dSgi3b8CfZK8r2NH4444VT74ATUixGFteHRb7kZ4ec0f25i7fwL6SzyO70LaV4Ugl62bDve35a1bQXKcvAi6QYHHTDIS2a_ZY9L_lEo4g"
              alt="Tennis court"
              fill
              sizes="50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#131b2ecc] to-transparent" />
            <div className="absolute bottom-8 left-8 right-8 text-white">
              <h2 className="text-4xl font-extrabold tracking-tight">Dominate the Court.</h2>
              <p className="mt-2 text-slate-200">
                Join the platform for high-performance sports management and seamless booking.
              </p>
            </div>
          </div>
          <div className="flex min-h-[720px] items-center justify-center p-6 md:p-10">
            <RegisterForm />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
