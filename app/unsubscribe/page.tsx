import { createServiceClient } from "@/lib/supabase/service";

export default async function UnsubscribePage({
  searchParams,
}: { searchParams: { t?: string } }) {
  const token = searchParams.t;
  let result: "ok" | "missing" | "invalid" | "error" = "missing";
  let email = "";

  if (token) {
    const admin = createServiceClient();
    const { data: msg } = await admin
      .from("email_messages")
      .select("organization_id, to_email")
      .eq("unsubscribe_token", token)
      .maybeSingle();
    if (!msg) result = "invalid";
    else {
      email = msg.to_email;
      const { error } = await admin.from("unsubscribes")
        .upsert({
          organization_id: msg.organization_id,
          email: msg.to_email.toLowerCase(),
          source: "link",
        }, { onConflict: "organization_id,email" });
      result = error ? "error" : "ok";
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white border rounded-lg shadow-sm p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">수신거부</h1>
        {result === "ok" && (
          <>
            <p className="text-sm text-gray-600">
              <strong>{email}</strong> 주소가 영구적으로 수신거부 처리되었습니다.
            </p>
            <p className="text-xs text-gray-500 mt-2">앞으로 본 발신자로부터 광고성 메일을 받지 않습니다.</p>
          </>
        )}
        {result === "missing" && (
          <p className="text-sm text-gray-600">잘못된 접근입니다. 메일에 포함된 링크를 이용해주세요.</p>
        )}
        {result === "invalid" && (
          <p className="text-sm text-gray-600">유효하지 않은 토큰입니다.</p>
        )}
        {result === "error" && (
          <p className="text-sm text-red-600">처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
        )}
      </div>
    </div>
  );
}
