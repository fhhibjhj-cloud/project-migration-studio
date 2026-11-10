// Draws the Persian official financial report as a high-res PNG and saves/shares it.
export interface ReportData {
  title: string; raceDate: string; unitPrice: number;
  grossFund: number; adminProfit: number; refund: number; winnersPayout: number;
  sixSlips: number; fiveSlips: number; sixWinners: number; fiveWinners: number;
  sixPrize: number; fivePrize: number; sixPool: number; fivePool: number;
}
const fa = (n: number) => Math.round(n || 0).toLocaleString('fa-IR');
const T = (n: number) => `${fa(n)} تومان`;

export async function downloadOfficialReport(d: ReportData) {
  const W = 1240, H = 1754, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  try { await (document as any).fonts?.ready; } catch {}
  const F = (s: number, w = 700) => `${w} ${s}px Vazirmatn, Tahoma, sans-serif`;
  x.direction = 'rtl';
  const txt = (s: string, px: number, py: number, size: number, color = '#0f172a', align: CanvasTextAlign = 'right', w = 700) => {
    x.font = F(size, w); x.fillStyle = color; x.textAlign = align; x.fillText(s, px, py);
  };
  const box = (bx: number, by: number, bw: number, bh: number, fill: string, stroke = '#e2e8f0') => {
    x.beginPath(); x.roundRect(bx, by, bw, bh, 22); x.fillStyle = fill; x.fill();
    x.strokeStyle = stroke; x.lineWidth = 2; x.stroke();
  };
  x.fillStyle = '#fbfaf6'; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#c9a227'; x.lineWidth = 6; x.strokeRect(24, 24, W - 48, H - 48);
  x.lineWidth = 2; x.strokeRect(40, 40, W - 80, H - 80);
  // watermark
  x.save(); x.translate(W / 2, H / 2); x.rotate(-0.5); x.globalAlpha = 0.05;
  txt('SAYKO', 0, 0, 260, '#0f172a', 'center', 900); x.restore();
  // header
  x.fillStyle = '#0f172a'; x.fillRect(40, 40, W - 80, 200);
  txt('SAYKO', W / 2, 120, 64, '#e6c45a', 'center', 900);
  txt('گزارش رسمی درآمد و عملکرد مالی سامانه', W / 2, 185, 40, '#ffffff', 'center', 800);
  const code = `SAYKO-${Date.now().toString().slice(-8)}`;
  const now = new Date();
  const dateFa = now.toLocaleDateString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const timeFa = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  txt(`کد رهگیری: ${code}`, W - 80, 290, 24, '#334155');
  txt(`تاریخ صدور: ${dateFa} - ساعت ${timeFa}`, 80, 290, 24, '#334155', 'left');
  // summary
  let y = 330; box(80, y, W - 160, 220, '#ffffff');
  txt('خلاصه مسابقه', W - 120, y + 55, 32, '#0f172a', 'right', 800);
  txt(`عنوان: ${d.title}`, W - 120, y + 110, 26, '#334155', 'right', 500);
  txt(`تاریخ مسابقه: ${d.raceDate}`, W - 120, y + 160, 26, '#334155', 'right', 500);
  txt(`قیمت پایه هر ترکیب: ${T(d.unitPrice)}`, 640, y + 110, 26, '#334155', 'right', 500);
  txt(`تعداد کل برگه‌ها: ${fa(d.sixSlips + d.fiveSlips)} برگه (شش‌پر ${fa(d.sixSlips)} / پنج‌پر ${fa(d.fiveSlips)})`, 640, y + 160, 22, '#334155', 'right', 500);
  // allocation
  y = 580; box(80, y, W - 160, 380, '#f0fdf4', '#bbf7d0');
  txt('تفکیک و توزیع صندوق', W - 120, y + 55, 32, '#047857', 'right', 800);
  const rows: [string, string][] = [
    ['صندوق کل (ناخالص) - ۱۰۰٪', T(d.grossFund)],
    ['سهم سامانه (کارمزد) - ۱۴٪', T(d.adminProfit)],
    ['عودت برگه‌های باخته بالای ۹۹ هزار تومان - ۱۵٪', T(d.refund)],
    ['صندوق نهایی برندگان - ۷۱٪', T(d.winnersPayout)],
  ];
  rows.forEach(([a, b], i) => {
    const ry = y + 120 + i * 65;
    txt(a, W - 120, ry, 26, '#0f172a', 'right', 600);
    txt(b, 120, ry, 28, i === 3 ? '#047857' : '#0f172a', 'left', 800);
    if (i < 3) { x.strokeStyle = '#d1fae5'; x.beginPath(); x.moveTo(120, ry + 25); x.lineTo(W - 120, ry + 25); x.stroke(); }
  });
  // winners table
  y = 990; box(80, y, W - 160, 290, '#eff6ff', '#bfdbfe');
  txt('برندگان و جوایز', W - 120, y + 55, 32, '#1d4ed8', 'right', 800);
  const cols = [W - 120, 860, 640, 420, 120];
  const head = ['نوع برگه', 'صندوق', 'تعداد برگه', 'تعداد برندگان', 'جایزه هر برگه'];
  head.forEach((h, i) => txt(h, cols[i], y + 115, 22, '#475569', i === 4 ? 'left' : 'right', 700));
  const tr = [
    ['شش‌پر', T(d.sixPool), fa(d.sixSlips), fa(d.sixWinners), T(d.sixPrize)],
    ['پنج‌پر', T(d.fivePool), fa(d.fiveSlips), fa(d.fiveWinners), T(d.fivePrize)],
  ];
  tr.forEach((r, ri) => r.forEach((v, i) => txt(v, cols[i], y + 180 + ri * 60, 24, '#0f172a', i === 4 ? 'left' : 'right', 600)));
  // statement
  y = 1310; box(80, y, W - 160, 200, '#ffffff');
  txt('بیانیه شفافیت', W - 120, y + 55, 30, '#0f172a', 'right', 800);
  ['این گزارش مستقیماً از اطلاعات ثبت‌شده در سامانه سایکو تولید شده و تمامی مبالغ', 'بر اساس فرمول رسمی ۱۴٪ کارمزد، ۱۵٪ عودت و ۷۱٪ صندوق برندگان محاسبه گردیده است.', 'هیچ‌گونه تغییر دستی در ارقام این گزارش امکان‌پذیر نیست.']
    .forEach((s, i) => txt(s, W - 120, y + 105 + i * 38, 22, '#475569', 'right', 500));
  // signature + seal
  txt('مدیریت سامانه سایکو', W - 160, 1590, 26, '#0f172a', 'right', 800);
  x.strokeStyle = '#1e3a8a'; x.lineWidth = 3; x.beginPath();
  x.moveTo(W - 420, 1650); x.bezierCurveTo(W - 380, 1590, W - 330, 1680, W - 280, 1620); x.bezierCurveTo(W - 240, 1580, W - 200, 1660, W - 160, 1630); x.stroke();
  const sx = 230, sy = 1620;
  const g = x.createRadialGradient(sx, sy, 10, sx, sy, 110); g.addColorStop(0, '#f5d76e'); g.addColorStop(1, '#b8860b');
  x.beginPath(); for (let i = 0; i < 48; i++) { const r = i % 2 ? 100 : 112, a = (i / 48) * Math.PI * 2; x.lineTo(sx + r * Math.cos(a), sy + r * Math.sin(a)); }
  x.closePath(); x.fillStyle = g; x.fill();
  x.beginPath(); x.arc(sx, sy, 80, 0, Math.PI * 2); x.strokeStyle = '#fff8dc'; x.lineWidth = 4; x.stroke();
  txt('✓', sx, sy - 5, 56, '#ffffff', 'center', 900);
  txt('گزارش رسمی', sx, sy + 40, 22, '#ffffff', 'center', 800);
  txt('تأیید شده', sx, sy + 66, 18, '#fff8dc', 'center', 700);

  const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), 'image/png'));
  const name = `SAYKO_Report_${code}.png`;
  const file = new File([blob], name, { type: 'image/png' });
  const nav = navigator as any;
  if (nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], title: 'گزارش رسمی سایکو' }); return; } catch (e: any) { if (e?.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
