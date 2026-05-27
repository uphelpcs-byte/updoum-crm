"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard",  label: "대시보드" },
  { href: "/jobs",       label: "채용 공고" },
  { href: "/proposals",  label: "제안서 템플릿" },
  { href: "/campaigns",  label: "발송 이력" },
  { href: "/settings",   label: "설정" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
      <div className="h-14 flex items-center px-6 border-b border-gray-200">
        <span className="text-lg font-bold text-brand-600">업도움 CRM</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block px-3 py-2 rounded-md text-sm font-medium",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
