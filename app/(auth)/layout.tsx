// 로그인/회원가입은 useSearchParams()를 사용해 정적 사전 렌더링이 불가능합니다.
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-600">업도움 CRM</h1>
          <p className="text-sm text-gray-500 mt-2">CS 외주 영업 자동화</p>
        </div>
        {children}
      </div>
    </div>
  );
}
