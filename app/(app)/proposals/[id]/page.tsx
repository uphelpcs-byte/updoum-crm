import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TemplateEditor from "../template-editor";

export default async function ProposalEditPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: tpl } = await supabase
    .from("proposal_templates")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!tpl) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">제안서 템플릿 수정</h1>
      <TemplateEditor
        mode="edit"
        id={tpl.id}
        initial={{
          name: tpl.name,
          subject: tpl.subject,
          body_html: tpl.body_html,
          is_default: tpl.is_default,
          attachment_path: tpl.attachment_path,
        }}
      />
    </div>
  );
}
