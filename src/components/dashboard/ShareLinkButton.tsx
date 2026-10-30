import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { g } from "@/hooks/use-gender";
import { t as tr } from "@/i18n";

// زر للصفحات الفارغة: ينسخ رابط صفحة المصوّرة العامة لتشاركه، فهو أسرع طريق لأول طلب
export function ShareLinkButton() {
  const [url, setUrl] = useState("");
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from("profiles").select("username, is_published").eq("id", session.user.id).maybeSingle();
      if (data?.username && data.is_published) setUrl(`${window.location.origin}/photographers/${data.username}`);
    })();
  }, []);
  if (!url) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(url); toast.success(tr("نُسخ رابط صفحتك")); }
        catch { toast.error(url); }
      }}
      className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2 text-sm font-medium text-charcoal active:scale-95 transition-transform"
    >
      <Link2 className="h-4 w-4" />{" "}{g(tr("انسخي رابط صفحتك وشاركيه"), tr("انسخ رابط صفحتك وشاركه"))}
    </button>
  );
}
