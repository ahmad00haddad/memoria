import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import heroImg from "@/assets/hero-bride.jpg";
import { useAuthState } from "@/hooks/use-auth-state";
import { fadeUp, scaleIn, staggerContainer, viewportOnce } from "@/lib/animations";
import { ScrollReveal } from "@/components/ScrollReveal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Memoria · ميموريا — منصّة تصوير المناسبات في الأردن" },
      { name: "description", content: "احجزي مصوّرة أعراس ومناسبات موثّقة في الأردن. باقات واضحة، عربون CliQ مباشر، وتقييمات من حجوزات مكتملة فقط." },
      { property: "og:title", content: "Memoria · ميموريا — تصوير المناسبات" },
      { property: "og:description", content: "منصّة لحجز مصوّرات المناسبات بثقة — أسعار شفافة، عربون مباشر، وتقييمات موثّقة." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://memoria-jo.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://memoria-jo.lovable.app/" }],
  }),
  component: Landing,
});

function Landing() {
  const [featured, setFeatured] = useState<any[]>([]);
  const { loading: authLoading, isPhotographer, userId } = useAuthState();

  useEffect(() => {
    let active = true;
    supabase
      .from("profiles")
      .select("username,display_name,city,cover_url,avatar_url")
      .eq("is_published", true)
      .eq("is_featured", true)
      .limit(4)
      .then(({ data }) => {
        if (active) setFeatured(data ?? []);
      });
    return () => { active = false; };
  }, []);

  return (
    <div className="min-h-screen bg-background selection:bg-gold/30 selection:text-charcoal">
      <Header />

      {/* Hero Section - Split Editorial Layout */}
      <section className="relative pt-12 pb-24 lg:pt-24 lg:pb-32 overflow-hidden">
        <div className="container-editorial grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          <motion.div 
            className="lg:col-span-5 order-2 lg:order-1 flex flex-col items-start"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={fadeUp} className="text-[10px] uppercase tracking-[0.25em] text-gold mb-6 font-medium">
              حجوزات التصوير في الأردن
            </motion.div>
            
            <motion.h1 
              variants={fadeUp}
              className="font-serif text-5xl md:text-7xl lg:text-[5.5rem] leading-[1.05] tracking-tight text-foreground mb-8"
            >
              الذكرى الأبدية<br/>
              <span className="italic text-charcoal/70">تبدأ هنا.</span>
            </motion.h1>
            
            <motion.p variants={fadeUp} className="text-lg md:text-xl text-muted-foreground/90 max-w-md leading-relaxed mb-10 font-sans font-light">
              احجزي مصوّرة زفافك خلال دقائق. أسعار واضحة، مواعيد حقيقية، وعربون آمن. وداعاً لفوضى الرسائل.
            </motion.p>
            
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link
                to="/search"
                className="group relative inline-flex items-center justify-center gap-3 bg-charcoal text-ivory px-8 py-4 text-sm font-medium uppercase tracking-[0.1em] overflow-hidden transition-all hover:bg-charcoal/90"
              >
                <span className="relative z-10">البحث عن مصوّرة</span>
                <ArrowLeft className="h-4 w-4 relative z-10 group-hover:-translate-x-1 transition-transform" />
              </Link>
              
              {!authLoading && !isPhotographer && (
                <Link
                  to="/photographers/join"
                  className="inline-flex items-center justify-center gap-2 border border-border px-8 py-4 text-sm font-medium uppercase tracking-[0.1em] text-charcoal hover:border-charcoal hover:bg-charcoal/5 transition-colors"
                >
                  أنا مصوّرة
                </Link>
              )}
              {!authLoading && isPhotographer && (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center gap-2 border border-border px-8 py-4 text-sm font-medium uppercase tracking-[0.1em] text-charcoal hover:border-charcoal hover:bg-charcoal/5 transition-colors"
                >
                  لوحة التحكم
                </Link>
              )}
            </motion.div>
          </motion.div>

          <motion.div 
            className="lg:col-span-7 order-1 lg:order-2 relative"
            variants={scaleIn}
            initial="hidden"
            animate="visible"
          >
            {/* Asymmetric Image Presentation */}
            <div className="relative w-full aspect-[4/5] md:aspect-square lg:aspect-[4/5] max-w-2xl ms-auto">
              <img
                src={heroImg}
                alt="عروس أردنية"
                className="w-full h-full object-cover shadow-soft grayscale-[20%] contrast-105"
              />
              <div className="absolute inset-0 border border-black/5 mix-blend-overlay pointer-events-none" />
              
              {/* Subtle accent blocks to break the box */}
              <div className="absolute -bottom-6 -start-6 w-3/4 h-32 bg-gold/10 -z-10 mix-blend-multiply" />
              <div className="absolute -top-4 -end-4 w-1/2 h-1/2 border border-gold/20 -z-10" />
            </div>
          </motion.div>

        </div>
      </section>

      {/* Bento Layout Features */}
      <ScrollReveal delay={0.1}>
        <section className="container-editorial py-24 border-t border-border/50">
          <div className="max-w-xl mb-16">
            <h2 className="font-serif text-4xl md:text-5xl mb-4">الوضوح المفقود.</h2>
            <p className="text-muted-foreground text-lg leading-relaxed font-light">
              صممنا ميموريا لإنهاء معاناة البحث عن مصورة. كل التفاصيل التي تحتاجينها متوفرة أمامك مباشرة لتتخذي قرارك بثقة.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 auto-rows-[280px]">
            {/* Main Feature - Span 2 */}
            <div className="md:col-span-2 md:row-span-2 bg-charcoal text-ivory p-8 md:p-12 flex flex-col justify-end relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/80 to-transparent z-10" />
              <img src={heroImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-[2s] ease-out" />
              
              <div className="relative z-20 max-w-md">
                <div className="text-[10px] uppercase tracking-[0.25em] text-gold/80 mb-4">وداعاً للواتساب</div>
                <h3 className="font-serif text-3xl md:text-4xl mb-4 text-ivory">لا مزيد من "ممكن التفاصيل؟"</h3>
                <p className="text-ivory/70 leading-relaxed font-light text-sm md:text-base">
                  الأسعار، ساعات العمل، الإضافات، ورسوم التنقل خارج عمّان... كلها محسوبة بدقة في واجهة واحدة. احجزي وادفعي العربون عبر CliQ ليتم تأكيد الحجز مباشرة في تقويم المصورة.
                </p>
              </div>
            </div>

            {/* Small Feature 1 */}
            <div className="bg-card border border-border p-8 flex flex-col justify-between">
              <div className="w-8 h-8 rounded-full border border-gold/30 flex items-center justify-center text-gold text-sm font-serif italic">1</div>
              <div>
                <h4 className="font-serif text-xl mb-2">تقويم حي ومباشر</h4>
                <p className="text-sm text-muted-foreground font-light leading-relaxed">
                  مربوط بتقويم Google للمصورة لتجنب الحجوزات المزدوجة، مع فاصل زمني إلزامي لضمان عدم التأخير.
                </p>
              </div>
            </div>

            {/* Small Feature 2 */}
            <div className="bg-[#f5f2eb] border border-[#ebe5d5] p-8 flex flex-col justify-between">
              <div className="w-8 h-8 rounded-full border border-charcoal/20 flex items-center justify-center text-charcoal text-sm font-serif italic">2</div>
              <div>
                <h4 className="font-serif text-xl mb-2 text-charcoal">عقود رقمية موثقة</h4>
                <p className="text-sm text-charcoal/70 font-light leading-relaxed">
                  يتم إصدار عقد رقمي تلقائياً بعد تأكيد الحجز، يضمن حقوق الطرفين وشروط الاسترداد في حال الإلغاء.
                </p>
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Elegant Testimonials (Masonry/Asymmetric) */}
      <ScrollReveal delay={0.1}>
        <section className="py-24 bg-charcoal text-ivory">
          <div className="container-editorial">
            <h2 className="font-serif text-4xl text-center mb-16 italic text-gold">أصوات حقيقية</h2>
            
            <div className="grid md:grid-cols-2 gap-12 lg:gap-24 max-w-4xl mx-auto">
              <div className="space-y-4">
                <div className="text-gold text-4xl font-serif">"</div>
                <p className="font-serif text-2xl leading-relaxed text-ivory/90">
                  تجربة مريحة جداً. ما اضطريت أستنى أيام عشان أعرف السعر، حجزت ودفعت العربون بـ CliQ وكل شي تم بسلاسة.
                </p>
                <div className="text-xs uppercase tracking-widest text-ivory/50 pt-4 border-t border-ivory/10">— سارة الأحمد</div>
              </div>

              <div className="space-y-4 md:mt-24">
                <div className="text-gold text-4xl font-serif">"</div>
                <p className="font-serif text-2xl leading-relaxed text-ivory/90">
                  العقد الرقمي والوضوح في سياسة الإلغاء ريحني كثير. المصورة كانت محترفة جداً والصور وصلتني بوقتها.
                </p>
                <div className="text-xs uppercase tracking-widest text-ivory/50 pt-4 border-t border-ivory/10">— دانة وليد</div>
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Featured Photographers */}
      {featured.length > 0 && (
        <ScrollReveal delay={0.1}>
          <section className="container-editorial py-24 border-t border-border/50">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div>
                <h2 className="font-serif text-4xl mb-4">نخبة المصورات</h2>
                <p className="text-muted-foreground font-light max-w-md">أعمال تتحدث عن نفسها، وحجوزات موثقة بتقييمات حقيقية.</p>
              </div>
              <Link to="/search" className="text-sm font-medium uppercase tracking-[0.1em] text-charcoal border-b border-charcoal pb-1 hover:text-gold hover:border-gold transition-colors inline-flex items-center gap-2">
                عرض الجميع <ArrowLeft className="h-3 w-3" />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
              {featured.map((p, i) => (
                <Link key={p.username} to="/photographers/$username" params={{ username: p.username }} className="group block">
                  <div className={`aspect-[3/4] mb-4 overflow-hidden bg-[#f5f2eb] ${i % 2 !== 0 ? 'lg:mt-8' : ''}`}>
                    {p.cover_url && (
                      <img 
                        src={p.cover_url} 
                        alt={p.display_name} 
                        className="w-full h-full object-cover filter grayscale-[10%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" 
                      />
                    )}
                  </div>
                  <h3 className="font-serif text-xl group-hover:text-gold transition-colors">{p.display_name}</h3>
                  {p.city && <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{p.city}</div>}
                </Link>
              ))}
            </div>
          </section>
        </ScrollReveal>
      )}

      <Footer />
    </div>
  );
}
