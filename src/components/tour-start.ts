// خفيف عمداً: يُشغّل جولة المصوّرة دون سحب مكوّن الجولة نفسه. المفتاح يطابق PhotographerTour.tsx.
export function startPhotographerTour() {
  try {
    localStorage.setItem("photographer_tour_v1", JSON.stringify({ status: "active", step: 0, min: false }));
    window.dispatchEvent(new Event("photographer-tour"));
  } catch { /* ignore */ }
}
