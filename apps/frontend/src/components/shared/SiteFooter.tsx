import Link from 'next/link';
import { Globe, Mail, Share2 } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-300 bg-[#eff4ff] py-12">
      <div className="mx-auto grid w-full max-w-[1440px] gap-8 px-5 md:grid-cols-2 md:px-8">
        <div>
          <h3 className="text-3xl font-extrabold text-black">CourtCommand</h3>
          <p className="mt-4 max-w-md text-slate-600">
            Empowering facility managers and athletes with high-performance digital tools. The
            future of sports management is here.
          </p>
          <div className="mt-6 flex gap-4 text-slate-700">
            <Globe className="h-4 w-4" />
            <Mail className="h-4 w-4" />
            <Share2 className="h-4 w-4" />
          </div>
        </div>
        <div className="flex flex-col gap-8 md:items-end">
          <div className="grid grid-cols-2 gap-10 text-sm text-slate-700">
            <div className="space-y-3">
              <Link href="#" className="hover:text-[#944a00]">
                Privacy Policy
              </Link>
              <Link href="#" className="hover:text-[#944a00]">
                Terms of Service
              </Link>
            </div>
            <div className="space-y-3">
              <Link href="#" className="hover:text-[#944a00]">
                Partner Program
              </Link>
              <Link href="#" className="hover:text-[#944a00]">
                Contact Support
              </Link>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} CourtCommand. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
