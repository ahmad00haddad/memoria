import { X, Check, Star } from "lucide-react";
import { type SearchResultItem } from "@/lib/search.functions";
import { Link } from "@tanstack/react-router";
import { Drawer } from "vaul";
import { playSound } from "@/lib/sounds";

export function CompareMode({
  compareList,
  setCompareList
}: {
  compareList: SearchResultItem[];
  setCompareList: React.Dispatch<React.SetStateAction<SearchResultItem[]>>;
}) {
  if (compareList.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-50 pointer-events-none">
      <div className="max-w-md mx-auto bg-card border border-border shadow-elegant rounded-full p-2 flex items-center justify-between pointer-events-auto backdrop-blur-md bg-card/90">
        <div className="flex items-center gap-2 pl-4">
          <div className="flex -space-x-3 rtl:space-x-reverse">
            {compareList.map((item, i) => (
              <img 
                key={item.username} 
                src={item.avatar_url || "https://images.unsplash.com/photo-1516274626895-055a99214f08?q=80&w=200&auto=format&fit=crop"} 
                alt={item.display_name}
                className="w-8 h-8 rounded-full border-2 border-background object-cover"
                style={{ zIndex: 10 - i }}
              />
            ))}
          </div>
          <span className="text-sm font-medium pr-2">
            {compareList.length}/3 للمقارنة
          </span>
        </div>
        
        <div className="flex items-center gap-2 pr-2">
          <Drawer.Root>
            <Drawer.Trigger asChild>
              <button 
                className="bg-gold text-charcoal px-4 py-2 rounded-full text-sm font-medium hover:bg-gold/90 transition-colors shadow-soft"
                onClick={() => playSound('tick')}
              >
                قارني الآن
              </button>
            </Drawer.Trigger>
            <Drawer.Portal>
              <Drawer.Overlay className="fixed inset-0 bg-black/60 z-[99]" />
              <Drawer.Content className="bg-background flex flex-col rounded-t-[20px] h-[85vh] mt-24 fixed bottom-0 left-0 right-0 z-[100] outline-none">
                <div className="p-4 bg-card border-b border-border flex justify-between items-center rounded-t-[20px]">
                  <h2 className="font-serif text-xl font-bold">مقارنة المصورات</h2>
                  <button onClick={() => setCompareList([])} className="text-sm text-muted-foreground hover:text-foreground">
                    إفراغ الكل
                  </button>
                </div>
                
                <div className="flex-1 overflow-auto p-4">
                  <div className="flex gap-4 min-w-max pb-8">
                    {compareList.map((photographer) => (
                      <div key={photographer.username} className="w-[280px] bg-card border border-border rounded-xl overflow-hidden shrink-0 shadow-soft relative">
                        <button 
                          onClick={() => {
                            setCompareList(prev => prev.filter(p => p.username !== photographer.username));
                            playSound('tick');
                          }}
                          className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/80 z-10"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        
                        <div className="h-32 bg-secondary relative">
                          {photographer.cover_url && (
                            <img src={photographer.cover_url} className="w-full h-full object-cover" alt="" />
                          )}
                          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
                            <img src={photographer.avatar_url || "https://images.unsplash.com/photo-1516274626895-055a99214f08?q=80&w=200&auto=format&fit=crop"} className="w-16 h-16 rounded-full border-4 border-card object-cover bg-muted" alt="" />
                          </div>
                        </div>
                        
                        <div className="p-4 pt-10 text-center flex flex-col items-center">
                          <h3 className="font-bold text-lg">{photographer.display_name}</h3>
                          <p className="text-sm text-muted-foreground mb-4">{photographer.city || "الأردن"}</p>
                          
                          <div className="w-full space-y-3 text-sm text-right">
                            <div className="flex justify-between border-b border-border/50 pb-2">
                              <span className="text-muted-foreground">السعر يبدأ من</span>
                              <span className="font-medium text-gold">{photographer.min_price ? `${photographer.min_price} د.أ` : 'غير محدد'}</span>
                            </div>
                            <div className="flex justify-between border-b border-border/50 pb-2">
                              <span className="text-muted-foreground">التقييم</span>
                              <span className="font-medium flex items-center gap-1">
                                {photographer.avg_rating.toFixed(1)} <Star className="w-3 h-3 text-gold fill-gold" />
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-border/50 pb-2">
                              <span className="text-muted-foreground">المراجعات</span>
                              <span className="font-medium">{photographer.review_count} مراجعة</span>
                            </div>
                            <div className="flex justify-between pb-2">
                              <span className="text-muted-foreground">موثوقة</span>
                              <span>{photographer.verification_status === 'verified' ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-muted-foreground" />}</span>
                            </div>
                          </div>
                          
                          <Link 
                            to="/photographers/$username"
                            params={{ username: photographer.username }}
                            className="w-full mt-6 bg-secondary text-secondary-foreground py-2 rounded-md font-medium hover:bg-secondary/80 transition-colors block text-center"
                            onClick={() => playSound('tick')}
                          >
                            عرض الملف
                          </Link>
                        </div>
                      </div>
                    ))}
                    
                    {compareList.length < 3 && (
                      <div className="w-[280px] bg-secondary/30 border-2 border-dashed border-border rounded-xl flex items-center justify-center text-muted-foreground shrink-0 h-[450px]">
                        يمكنك إضافة {3 - compareList.length} مصورة أخرى
                      </div>
                    )}
                  </div>
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
          
          <button 
            className="w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary text-muted-foreground transition-colors"
            onClick={() => {
              setCompareList([]);
              playSound('tick');
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
