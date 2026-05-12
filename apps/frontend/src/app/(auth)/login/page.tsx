import Image from 'next/image';
import { LoginForm } from '@/components/auth/LoginForm';
import { Navbar } from '@/components/shared/Navbar';
import { SiteFooter } from '@/components/shared/SiteFooter';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30]">
      <Navbar />
      <main className="mx-auto flex w-full max-w-[1280px] flex-1 items-center px-4 py-10 md:px-8">
        <div className="grid w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-2">
          <div className="relative hidden min-h-[640px] lg:block">
            <Image
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBQ1rzG9sRTRt81dmkKlnb581L1KEb2Vi2LQQ6i0X8b0sESlBC8V-ZJTx42DUATPil7RXGyvOPoqpwvljB0ww8S31RHLf6aDBDZCDTdCzUnP0zAUPLizJMkKuF8pWHwTvdu1UW5CyrENAZE8xSh8U7nQt8UQOuLho1l-kwo3PVmDYXeCj06R9mEJjoLYASUG3Kx-ZDpI3uFI8VXdaGe58BTcaoK3dT27qg9u06_k9AjNZEv9V2Xtfz1rn5QrMZhUQ89SszUeKRrzQ"
              alt="Indoor basketball court"
              fill
              sizes="50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#131b2ecc] to-transparent" />
            <div className="absolute bottom-8 left-8 right-8 text-white">
              <h2 className="text-4xl font-extrabold tracking-tight">Command the Court.</h2>
              <p className="mt-2 text-slate-200">
                High-performance management for high-stakes games.
              </p>
            </div>
          </div>
          <div className="flex min-h-[640px] items-center justify-center p-6 md:p-10">
            <LoginForm />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
