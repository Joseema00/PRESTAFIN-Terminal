/**
 * Renderizador del Informe Ejecutivo de Prestafin.
 * Documento A4 vectorial diseñado específicamente para PDF (no es una captura del dashboard).
 */
import { jsPDF } from "jspdf";
import { eur } from "@/lib/finance";
import { UPGRADE_HINTS } from "./sections";
import type { ReportData } from "./types";

const A4 = { w: 595.28, h: 841.89 };
const M = 48;
const CONTENT_W = A4.w - M * 2;

const COLORS = {
  navy: [11, 22, 37] as const,
  ivory: [247, 244, 237] as const,
  forest: [23, 55, 45] as const,
  gold: [184, 155, 94] as const,
  slate: [92, 104, 118] as const,
  line: [219, 214, 203] as const,
  soft: [245, 243, 238] as const,
  debt: [59, 81, 104] as const,
  gain: [46, 125, 91] as const,
  white: [255, 255, 255] as const,
  oxblood: [93, 46, 58] as const,
  oldMoneyCover: [250, 247, 240] as const,
};

const dec = (n: number, digits = 2) =>
  n.toLocaleString("es-ES", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const pctText = (n: number | null, digits = 1) => (n === null ? "No disponible" : `${dec(n, digits)}%`);
const num = (n: number | null, digits = 2) => (n === null ? "No disponible" : dec(n, digits));
const signedPct = (n: number, digits = 1) => `${n >= 0 ? "+" : ""}${dec(n, digits)}`;

type RGB = readonly [number, number, number];

class Doc {
  doc: jsPDF;
  y = M;
  section = 0;

  constructor() {
    this.doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
    this.doc.setFont("helvetica", "normal");
  }

  get d() {
    return this.doc;
  }

  fill(c: RGB) {
    this.doc.setFillColor(c[0], c[1], c[2]);
  }
  stroke(c: RGB) {
    this.doc.setDrawColor(c[0], c[1], c[2]);
  }
  text(c: RGB) {
    this.doc.setTextColor(c[0], c[1], c[2]);
  }

  newPage() {
    this.doc.addPage();
    this.y = M + 26;
  }

  ensure(h: number) {
    if (this.y + h > A4.h - M - 24) this.newPage();
  }

  gap(h: number) {
    this.y += h;
  }

  /* ------------------------------ Tipografía ------------------------------ */

  sectionTitle(title: string, subtitle?: string) {
    this.ensure(74);
    this.section += 1;
    this.stroke(COLORS.gold);
    this.doc.setLineWidth(1.4);
    this.doc.line(M, this.y, M + 34, this.y);
    this.y += 16;
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(16);
    this.text(COLORS.navy);
    this.doc.text(`${this.section}. ${title}`, M, this.y);
    this.y += subtitle ? 14 : 10;
    if (subtitle) {
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(9.5);
      this.text(COLORS.slate);
      this.doc.text(subtitle, M, this.y);
      this.y += 12;
    }
    this.y += 10;
  }

  subTitle(title: string) {
    this.ensure(34);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(11);
    this.text(COLORS.forest);
    this.doc.text(title, M, this.y);
    this.y += 16;
  }

  paragraph(text: string, opts: { size?: number; color?: RGB } = {}) {
    const size = opts.size ?? 9.6;
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(size);
    this.text(opts.color ?? COLORS.navy);
    const lines = this.doc.splitTextToSize(text, CONTENT_W) as string[];
    for (const line of lines) {
      this.ensure(size + 5);
      this.doc.text(line, M, this.y);
      this.y += size + 4.4;
    }
    this.y += 4;
  }

  bullets(items: string[], marker: RGB = COLORS.gold) {
    this.doc.setFontSize(9.6);
    for (const item of items) {
      this.doc.setFont("helvetica", "normal");
      this.text(COLORS.navy);
      const lines = this.doc.splitTextToSize(item, CONTENT_W - 16) as string[];
      this.ensure(lines.length * 14 + 4);
      this.fill(marker);
      this.doc.circle(M + 3, this.y - 3, 1.8, "F");
      for (const [i, line] of lines.entries()) {
        this.doc.text(line, M + 14, this.y + i * 13.4);
      }
      this.y += lines.length * 13.4 + 5;
    }
    this.y += 2;
  }

  note(text: string, tone: RGB = COLORS.gold) {
    this.doc.setFont("helvetica", "italic");
    this.doc.setFontSize(9);
    const lines = this.doc.splitTextToSize(text, CONTENT_W - 26) as string[];
    const h = lines.length * 12 + 18;
    this.ensure(h + 6);
    this.fill(COLORS.soft);
    this.doc.roundedRect(M, this.y - 10, CONTENT_W, h, 6, 6, "F");
    this.fill(tone);
    this.doc.rect(M, this.y - 10, 2.6, h, "F");
    this.text(COLORS.slate);
    lines.forEach((line, i) => this.doc.text(line, M + 14, this.y + 4 + i * 12));
    this.y += h + 6;
  }

  unavailable(text: string) {
    this.note(text, COLORS.slate);
  }

  /* -------------------------------- KPIs --------------------------------- */

  kpiGrid(items: { label: string; value: string; hint?: string | undefined }[], cols = 4) {
    const gapX = 10;
    const w = (CONTENT_W - gapX * (cols - 1)) / cols;
    const h = 58;
    for (let i = 0; i < items.length; i += cols) {
      const row = items.slice(i, i + cols);
      this.ensure(h + 10);
      row.forEach((kpi, j) => {
        const x = M + j * (w + gapX);
        this.fill(COLORS.soft);
        this.doc.roundedRect(x, this.y, w, h, 7, 7, "F");
        this.fill(COLORS.gold);
        this.doc.rect(x, this.y, w, 2, "F");
        this.doc.setFont("helvetica", "normal");
        this.doc.setFontSize(7.4);
        this.text(COLORS.slate);
        this.doc.text((this.doc.splitTextToSize(kpi.label.toUpperCase(), w - 16) as string[])[0] ?? "", x + 9, this.y + 17);
        this.doc.setFont("helvetica", "bold");
        this.doc.setFontSize(kpi.value.length > 12 ? 11 : 13);
        this.text(COLORS.navy);
        this.doc.text(kpi.value, x + 9, this.y + 35);
        if (kpi.hint) {
          this.doc.setFont("helvetica", "normal");
          this.doc.setFontSize(7);
          this.text(COLORS.slate);
          this.doc.text((this.doc.splitTextToSize(kpi.hint, w - 16) as string[])[0] ?? "", x + 9, this.y + 48);
        }
      });
      this.y += h + 10;
    }
  }

  /* -------------------------------- Tablas -------------------------------- */

  table(
    headers: string[],
    rows: (string | number)[][],
    opts: { widths?: number[]; align?: ("left" | "right")[]; highlight?: number } = {},
  ) {
    const widths = opts.widths ?? headers.map(() => CONTENT_W / headers.length);
    const align = opts.align ?? headers.map((_, i) => (i === 0 ? "left" : "right"));
    const rowH = 19;

    const drawHead = () => {
      this.ensure(rowH * 2);
      this.fill(COLORS.navy);
      this.doc.rect(M, this.y, CONTENT_W, rowH, "F");
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(8);
      this.text(COLORS.white);
      let x = M;
      headers.forEach((hd, i) => {
        const w = widths[i] ?? 0;
        const a = align[i] ?? "left";
        this.doc.text(hd, a === "right" ? x + w - 8 : x + 8, this.y + 12.6, a === "right" ? { align: "right" } : undefined);
        x += w;
      });
      this.y += rowH;
    };

    drawHead();
    rows.forEach((row, r) => {
      if (this.y + rowH > A4.h - M - 24) {
        this.newPage();
        drawHead();
      }
      if (r % 2 === 1) {
        this.fill(COLORS.soft);
        this.doc.rect(M, this.y, CONTENT_W, rowH, "F");
      }
      if (opts.highlight === r) {
        this.fill([238, 232, 216]);
        this.doc.rect(M, this.y, CONTENT_W, rowH, "F");
        this.fill(COLORS.gold);
        this.doc.rect(M, this.y, 2.4, rowH, "F");
      }
      this.doc.setFont("helvetica", opts.highlight === r ? "bold" : "normal");
      this.doc.setFontSize(8.4);
      this.text(COLORS.navy);
      let x = M;
      row.forEach((cell, i) => {
        const w = widths[i] ?? 0;
        const a = align[i] ?? "left";
        const raw = String(cell);
        const parts = this.doc.splitTextToSize(raw, w - 14) as string[];
        const txt = parts.length > 1 ? `${(parts[0] ?? "").trimEnd()}…` : (parts[0] ?? raw);
        this.doc.text(txt, a === "right" ? x + w - 8 : x + 8, this.y + 12.6, a === "right" ? { align: "right" } : undefined);
        x += w;
      });
      this.stroke(COLORS.line);
      this.doc.setLineWidth(0.4);
      this.doc.line(M, this.y + rowH, M + CONTENT_W, this.y + rowH);
      this.y += rowH;
    });
    this.y += 12;
  }

  /* -------------------------------- Gráficos ------------------------------ */

  private axes(x: number, y: number, w: number, h: number, maxV: number, xMax: number, xUnit: string) {
    this.stroke(COLORS.line);
    this.doc.setLineWidth(0.5);
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(7);
    this.text(COLORS.slate);
    for (let i = 0; i <= 4; i++) {
      const yy = y + h - (h * i) / 4;
      this.doc.line(x, yy, x + w, yy);
      const v = (maxV * i) / 4;
      this.doc.text(v >= 1000 ? `${Math.round(v / 1000)}k` : Math.round(v).toString(), x - 6, yy + 2.5, { align: "right" });
    }
    for (let i = 0; i <= 5; i++) {
      const xx = x + (w * i) / 5;
      const v = (xMax * i) / 5;
      this.doc.text(`${v >= 10 ? Math.round(v) : dec(v, 1)}${xUnit}`, xx, y + h + 11, { align: "center" });
    }
  }

  lineChart(
    title: string,
    series: { label: string; color: RGB; points: { x: number; y: number }[]; dashed?: boolean; area?: boolean }[],
    opts: { height?: number; xUnit?: string } = {},
  ) {
    const h = opts.height ?? 150;
    const boxH = h + 58;
    this.ensure(boxH);
    const x0 = M + 34;
    const w = CONTENT_W - 40;
    const yTop = this.y + 18;

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(9.5);
    this.text(COLORS.navy);
    this.doc.text(title, M, this.y + 8);

    const all = series.flatMap((s) => s.points);
    const maxV = Math.max(1, ...all.map((p) => p.y));
    const xMax = Math.max(1, ...all.map((p) => p.x));
    this.axes(x0, yTop, w, h, maxV, xMax, opts.xUnit ?? "a");

    const px = (v: number) => x0 + (v / xMax) * w;
    const py = (v: number) => yTop + h - (v / maxV) * h;

    for (const s of series) {
      if (s.points.length < 2) continue;
      if (s.area) {
        this.fill(s.color);
        this.doc.setGState(this.doc.GState({ opacity: 0.12 }));
        const pts: [number, number][] = s.points.map((p) => [px(p.x), py(p.y)]);
        this.doc.lines(
          pts.slice(1).map((p, i) => [p[0] - pts[i]![0], p[1] - pts[i]![1]] as [number, number])
            .concat([[0, yTop + h - py(s.points[s.points.length - 1]!.y)], [-(px(xMax) - x0), 0]]),
          pts[0]![0],
          pts[0]![1],
          [1, 1],
          "F",
          true,
        );
        this.doc.setGState(this.doc.GState({ opacity: 1 }));
      }
      this.stroke(s.color);
      this.doc.setLineWidth(1.4);
      if (s.dashed) this.doc.setLineDashPattern([3, 2], 0);
      for (let i = 1; i < s.points.length; i++) {
        const a = s.points[i - 1]!;
        const b = s.points[i]!;
        this.doc.line(px(a.x), py(a.y), px(b.x), py(b.y));
      }
      this.doc.setLineDashPattern([], 0);
    }

    // leyenda
    let lx = x0;
    const ly = yTop + h + 24;
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(7.6);
    for (const s of series) {
      this.fill(s.color);
      this.doc.rect(lx, ly - 4.5, 7, 3, "F");
      this.text(COLORS.slate);
      this.doc.text(s.label, lx + 11, ly - 1.5);
      lx += 13 + this.doc.getTextWidth(s.label) + 14;
    }
    this.y += boxH;
  }

  donut(title: string, slices: { label: string; value: number }[]) {
    const size = 128;
    this.ensure(size + 34);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(9.5);
    this.text(COLORS.navy);
    this.doc.text(title, M, this.y + 8);
    const top = this.y + 18;
    const cx = M + size / 2;
    const cy = top + size / 2;
    const r = size / 2 - 6;
    const total = slices.reduce((s, d) => s + d.value, 0) || 1;
    const palette: RGB[] = [COLORS.forest, COLORS.gold, COLORS.debt, COLORS.gain, COLORS.slate, [140, 120, 90], [90, 130, 150], [170, 140, 160]];

    let start = -Math.PI / 2;
    slices.forEach((s, i) => {
      const angle = (s.value / total) * Math.PI * 2;
      const steps = Math.max(2, Math.ceil(angle / 0.12));
      const pts: [number, number][] = [[cx, cy]];
      for (let k = 0; k <= steps; k++) {
        const a = start + (angle * k) / steps;
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      this.fill(palette[i % palette.length]!);
      const rel = pts.slice(1).map((p, k) => [p[0] - pts[k]![0], p[1] - pts[k]![1]] as [number, number]);
      this.doc.lines(rel, pts[0]![0], pts[0]![1], [1, 1], "F", true);
      start += angle;
    });
    this.fill(COLORS.white);
    this.doc.circle(cx, cy, r * 0.58, "F");

    let ly = top + 14;
    slices.forEach((s, i) => {
      this.fill(palette[i % palette.length]!);
      this.doc.rect(M + size + 22, ly - 5, 7, 7, "F");
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(8.2);
      this.text(COLORS.navy);
      const label = (this.doc.splitTextToSize(s.label, 210) as string[])[0] ?? s.label;
      this.doc.text(label, M + size + 34, ly);
      this.text(COLORS.slate);
      this.doc.text(`${eur(s.value)}  ·  ${dec((s.value / total) * 100, 1)}%`, M + CONTENT_W, ly, { align: "right" });
      ly += 14;
    });
    this.y = Math.max(top + size, ly) + 16;
  }

  barChart(title: string, bars: { label: string; value: number; color?: RGB }[]) {
    const h = 124;
    this.ensure(h + 46);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(9.5);
    this.text(COLORS.navy);
    this.doc.text(title, M, this.y + 8);
    const top = this.y + 26;
    const max = Math.max(1, ...bars.map((b) => b.value));
    const bw = Math.min(64, (CONTENT_W - 20) / bars.length - 12);
    bars.forEach((b, i) => {
      const x = M + 10 + i * ((CONTENT_W - 20) / bars.length);
      const bh = Math.max(2, (b.value / max) * (h - 44));
      this.fill(b.color ?? COLORS.forest);
      this.doc.roundedRect(x, top + (h - 30) - bh, bw, bh, 3, 3, "F");
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(7.4);
      this.text(COLORS.navy);
      this.doc.text(eur(b.value), x + bw / 2, top + (h - 30) - bh - 5, { align: "center" });
      this.doc.setFont("helvetica", "normal");
      this.text(COLORS.slate);
      const label = (this.doc.splitTextToSize(b.label, bw + 22) as string[]).slice(0, 2);
      label.forEach((l, k) => this.doc.text(l, x + bw / 2, top + h - 16 + k * 8, { align: "center" }));
    });
    this.y = top + h + 18;
  }
}

/* ============================== Documento =============================== */

export type ReportAssets = { logo?: string | null };

export function renderReportPdf(data: ReportData, assets: ReportAssets = {}): jsPDF {
  const R = new Doc();
  const d = R.d;
  const dateLabel = new Date(data.generatedAt).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const has = (k: string) => data.sections.includes(k as never);

  /* ------------------------------- Portada ------------------------------- */
  // Old-money aesthetic: warm cream canvas with forest green and gold accents
  d.setFillColor(COLORS.oldMoneyCover[0], COLORS.oldMoneyCover[1], COLORS.oldMoneyCover[2]);
  d.rect(0, 0, A4.w, A4.h, "F");

  // Decorative outer frame
  d.setDrawColor(COLORS.forest[0], COLORS.forest[1], COLORS.forest[2]);
  d.setLineWidth(1.2);
  d.rect(M - 12, M - 12, A4.w - (M - 12) * 2, A4.h - (M - 12) * 2, "S");
  d.setDrawColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
  d.setLineWidth(0.6);
  d.rect(M - 18, M - 18, A4.w - (M - 18) * 2, A4.h - (M - 18) * 2, "S");

  // Top gold accent rule
  d.setFillColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
  d.rect(M - 12, M - 12, A4.w - (M - 12) * 2, 3, "F");

  // Logo area
  if (assets.logo) {
    try {
      d.addImage(assets.logo, "PNG", M, 96, 44, 44);
    } catch {
      /* logo no disponible: la portada sigue siendo válida */
    }
  }
  d.setFont("helvetica", "bold");
  d.setFontSize(15);
  d.setTextColor(COLORS.forest[0], COLORS.forest[1], COLORS.forest[2]);
  d.text("PRESTAFIN", assets.logo ? M + 56 : M, 122);
  d.setFont("helvetica", "normal");
  d.setFontSize(8);
  d.setTextColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
  d.text("SILENT WEALTH TECHNOLOGY", assets.logo ? M + 56 : M, 134);

  // Center title block
  d.setFont("helvetica", "normal");
  d.setFontSize(30);
  d.setTextColor(COLORS.forest[0], COLORS.forest[1], COLORS.forest[2]);
  d.text("Informe Ejecutivo", M, 372);
  d.text("de Plan Financiero", M, 408);
  d.setFontSize(12);
  d.setTextColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
  d.text("Plan financiero personalizado", M, 436);

  // Decorative separator
  d.setDrawColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
  d.setLineWidth(0.8);
  d.line(M, 470, M + 120, 470);

  const meta: [string, string][] = [
    ["Preparado para", data.userName ?? data.userEmail ?? "Usuario de Prestafin"],
    ["Fecha de generación", dateLabel],
    ["Plan contratado", data.planName.toUpperCase()],
  ];
  let my = 506;
  for (const [k, v] of meta) {
    d.setFont("helvetica", "normal");
    d.setFontSize(7.6);
    d.setTextColor(COLORS.slate[0], COLORS.slate[1], COLORS.slate[2]);
    d.text(k.toUpperCase(), M, my);
    d.setFont("helvetica", "bold");
    d.setFontSize(12);
    d.setTextColor(COLORS.forest[0], COLORS.forest[1], COLORS.forest[2]);
    d.text(v, M, my + 16);
    my += 44;
  }

  d.setFont("helvetica", "normal");
  d.setFontSize(7.6);
  d.setTextColor(COLORS.slate[0], COLORS.slate[1], COLORS.slate[2]);
  d.text("Prestafin.tech · Documento confidencial generado para el titular de la cuenta.", M, A4.h - 54);

  /* --------------------------- Resumen ejecutivo -------------------------- */
  R.newPage();
  R.sectionTitle("Resumen ejecutivo", "Tu situación financiera en menos de un minuto");
  R.kpiGrid(data.kpis, 4);
  R.gap(4);
  R.subTitle("Diagnóstico");
  data.diagnosis.forEach((p) => R.paragraph(p));
  if (data.strengths.length) {
    R.subTitle("Puntos fuertes");
    R.bullets(data.strengths, COLORS.gain);
  }
  if (data.improvements.length) {
    R.subTitle("Puntos de mejora");
    R.bullets(data.improvements, COLORS.gold);
  }
  if (data.warnings.length) {
    R.subTitle("Aspectos que deberías revisar");
    R.bullets(data.warnings, COLORS.debt);
  }

  /* ------------------------ Situación financiera ------------------------- */
  R.newPage();
  R.sectionTitle("Situación financiera actual", "Activos, pasivos y patrimonio neto");
  const sit = data.situation;
  R.table(
    ["Concepto", "Importe"],
    [
      ...sit.assets.map((a) => [a.label, eur(a.value)] as (string | number)[]),
      ["Total activos", eur(sit.totalAssets)],
      ...sit.liabilities.map((l) => [l.label, `-${eur(l.value)}`] as (string | number)[]),
      ["Patrimonio neto", eur(sit.netWorth)],
    ],
    { widths: [CONTENT_W * 0.62, CONTENT_W * 0.38], highlight: sit.assets.length + sit.liabilities.length + 1 },
  );
  if (sit.assets.length) R.donut("Distribución de activos", sit.assets);
  else R.unavailable("No disponible — introduce tu liquidez, cartera u otros activos en tu perfil para completar el análisis.");

  R.subTitle("Indicadores de solidez");
  R.kpiGrid(
    [
      { label: "Health Score", value: `${Math.round(sit.healthScore)}/100` },
      { label: "Meses de colchón", value: dec(sit.liquidityMonths, 1) },
      { label: "Ratio endeudamiento", value: sit.debtRatio !== null ? `${dec(sit.debtRatio * 100, 1)}%` : "No disponible" },
      { label: "Ahorro mensual", value: eur(sit.monthlyContribution), hint: `Gastos ${eur(sit.monthlyExpenses)}` },
    ],
    4,
  );
  R.table(
    ["Componente del Health Score", "Puntuación", "Detalle"],
    sit.healthParts.map((p) => [p.label, `${Math.round(p.score)} / ${p.max}`, p.detail]),
    { widths: [CONTENT_W * 0.3, CONTENT_W * 0.16, CONTENT_W * 0.54], align: ["left", "right", "left"] },
  );

  /* ------------------------------ Hipoteca ------------------------------- */
  R.newPage();
  R.sectionTitle("Análisis del préstamo", "Deuda, coste financiero y calendario");
  const mg = data.mortgage;
  if (!mg.available) {
    R.unavailable("Todavía no has introducido los datos de tu préstamo. Añádelos en el Motor Patrimonial para desbloquear este análisis.");
  } else {
    R.kpiGrid(
      [
        { label: "Capital pendiente", value: eur(mg.principal) },
        { label: "Tipo de interés", value: `${dec(mg.rate, 2)}%` },
        { label: "Cuota mensual", value: eur(mg.payment), hint: mg.extraMonthly ? `+ ${eur(mg.extraMonthly)} extra` : undefined },
        { label: "Plazo restante", value: `${mg.years} años` },
        { label: "Intereses restantes", value: eur(mg.totalInterest) },
        { label: "Cancelación estimada", value: mg.payoffLabel },
        { label: "Cartera = deuda", value: mg.crossoverLabel },
        { label: "Amortización extra", value: mg.extraMonthly ? `${eur(mg.extraMonthly)}/mes` : "Sin amortización extra" },
      ],
      4,
    );
    R.lineChart("Evolución prevista de la deuda", [
      { label: "Deuda pendiente", color: COLORS.debt, points: mg.debtCurve.map((p) => ({ x: p.year, y: p.debt })), area: true },
    ]);
    R.subTitle("Cuadro de amortización anual");
    R.table(
      ["Año", "Intereses", "Capital amortizado", "Saldo pendiente"],
      mg.amortization.slice(0, 30).map((r) => [r.year, eur(r.interest), eur(r.principal), eur(r.balance)]),
      { widths: [CONTENT_W * 0.16, CONTENT_W * 0.28, CONTENT_W * 0.28, CONTENT_W * 0.28] },
    );

    if (has("mortgage_analysis")) {
      R.subTitle("Amortizar, mantener o invertir");
      const amortizeS = data.scenarios.find((s) => s.id === "amortize");
      const investS = data.scenarios.find((s) => s.id === "invest");
      const currentS = data.scenarios.find((s) => s.id === data.currentStrategyId);
      R.paragraph(
        `Si amortizas: el modelo estima ${eur(amortizeS?.interest ?? 0)} de intereses totales y la cancelación del préstamo en ${amortizeS?.payoffLabel ?? "—"}, con un patrimonio neto después de impuestos de ${eur(amortizeS?.netAfterTax ?? 0)}. El ahorro potencial en intereses frente a invertir todo el ahorro es de ${eur(Math.max(0, (investS?.interest ?? 0) - (amortizeS?.interest ?? 0)))}.`,
      );
      R.paragraph(
        `Si mantienes la deuda e inviertes: el modelo estima ${eur(investS?.interest ?? 0)} de intereses y un patrimonio neto después de impuestos de ${eur(investS?.netAfterTax ?? 0)}, asumiendo la rentabilidad y volatilidad históricas de tu cartera.`,
      );
      R.paragraph(
        `Tu estrategia actual (${currentS?.name ?? "—"}) proyecta ${eur(currentS?.netAfterTax ?? 0)} de patrimonio neto después de impuestos.`,
      );
    }
  }

  /* ------------------------------- Cartera -------------------------------- */
  R.newPage();
  R.sectionTitle("Análisis de la cartera", "Composición, rentabilidad y riesgo");
  const pf = data.portfolio;
  if (!pf.available) {
    R.unavailable("Todavía no has añadido una cartera de inversión. Añádela en Portfolio Lab para desbloquear este análisis.");
  } else {
    R.paragraph(
      `Cartera "${pf.name}" · ${eur(pf.total)} en ${pf.assetCount} posiciones · ${pf.realDataCount} con histórico real${pf.historyLabel ? ` · ${pf.historyLabel}` : ""}.`,
      { color: COLORS.slate },
    );
    R.table(
      ["Posición", "Clase de activo", "Importe", "Peso"],
      pf.positions.map((p) => [`${p.ticker} — ${p.name}`, p.cls, eur(p.amount), `${dec(p.weight * 100, 1)}%`]),
      { widths: [CONTENT_W * 0.38, CONTENT_W * 0.26, CONTENT_W * 0.18, CONTENT_W * 0.18] },
    );
    if (pf.allocation.length > 1) R.donut("Distribución por clase de activo", pf.allocation);
    if (pf.currencies.length > 1) R.donut("Distribución por divisa", pf.currencies);

    if (pf.er === null) {
      R.unavailable("No disponible — tus activos aún no tienen histórico suficiente para calcular rentabilidad y riesgo reales.");
    } else if (has("portfolio_analysis")) {
      R.subTitle("Rentabilidad y riesgo");
      R.kpiGrid(
        [
          { label: "Rentabilidad anualizada", value: pctText(pf.er) },
          { label: "Volatilidad", value: pctText(pf.vol) },
          { label: "Ratio de Sharpe", value: num(pf.sharpe) },
          { label: "Máximo drawdown", value: pf.maxDrawdown === null ? "No disponible" : pctText(pf.maxDrawdown) },
        ],
        4,
      );
      if (has("advanced_metrics")) {
        R.kpiGrid(
          [
            { label: "Ratio de Sortino", value: num(pf.sortino) },
            { label: "VaR 95% anual", value: pctText(pf.var95) },
            { label: "CVaR 95% anual", value: pctText(pf.cvar95) },
            { label: "Ratio de diversificación", value: num(pf.diversificationRatio) },
            { label: "Activos efectivos", value: num(pf.effectiveAssets, 1) },
            { label: "Concentración (HHI)", value: num(pf.concentration, 3) },
            { label: "Clases de activo", value: String(pf.allocation.length) },
            { label: "Divisas", value: String(pf.currencies.length) },
          ],
          4,
        );
        if (pf.topCorrelations.length) {
          R.subTitle("Correlaciones más altas entre posiciones");
          R.table(
            ["Par de activos", "Correlación"],
            pf.topCorrelations.map((c) => [`${c.a} · ${c.b}`, dec(c.value, 2)]),
            { widths: [CONTENT_W * 0.7, CONTENT_W * 0.3] },
          );
        }
      }
      if (pf.benchmark === null) {
        R.unavailable("Comparación con benchmark: no disponible — Prestafin no ha calculado un índice de referencia para esta cartera.");
      }
      if (pf.missing.length) {
        R.note(
          `Activos sin histórico incluidos en la cartera pero excluidos del cálculo: ${pf.missing.map((m) => m.ticker).join(", ")}.`,
          COLORS.debt,
        );
      }
    }
  }

  /* --------------------- Histórico real y benchmark ----------------------- */
  const adv = data.advanced;
  if (pf.available && (has("portfolio_history") || has("portfolio_benchmark"))) {
    R.newPage();
    R.sectionTitle("Comportamiento histórico de la cartera", "Backtest real con rebalanceo mensual y comparación con el mercado");
    if (has("portfolio_history")) {
      if (!adv.history) {
        R.unavailable("No disponible — se necesitan al menos 13 meses de histórico común entre tus activos para reconstruir el comportamiento de la cartera.");
      } else {
        const h = adv.history;
        R.paragraph(
          `Ventana analizada: ${h.from} — ${h.to} (${h.months} meses) sobre el ${dec(h.coverage, 1)}% del capital con histórico disponible.`,
          { color: COLORS.slate },
        );
        R.kpiGrid(
          [
            { label: "Rentabilidad anualizada real", value: pctText(h.cagr) },
            { label: "Volatilidad realizada", value: pctText(h.vol) },
            { label: "Máximo drawdown", value: pctText(h.maxDrawdown) },
            { label: "Meses positivos", value: pctText(h.positiveMonths) },
            { label: "Mejor año móvil", value: pctText(h.best12m) },
            { label: "Peor año móvil", value: pctText(h.worst12m) },
            { label: "VaR 95% mensual", value: pctText(h.var95) },
            { label: "CVaR 95% mensual", value: pctText(h.cvar95) },
          ],
          4,
        );
        R.lineChart(
          "Crecimiento de 100 € invertidos en tu cartera",
          [{ label: "Cartera", color: COLORS.forest, points: h.curve.map((p) => ({ x: p.x, y: p.y })), area: true }],
          { height: 140 },
        );
        if (adv.rolling3y) {
          R.paragraph(
            `Rentabilidad móvil a 3 años (${adv.rolling3y.count} ventanas): mínimo ${pctText(adv.rolling3y.min)}, media ${pctText(adv.rolling3y.avg)} y máximo ${pctText(adv.rolling3y.max)} anualizado.`,
          );
        }
        if (adv.drawdowns.length) {
          R.subTitle("Peores caídas encadenadas");
          R.table(
            ["Inicio", "Suelo", "Recuperación", "Caída", "Duración"],
            adv.drawdowns.map((dd) => [dd.from, dd.trough, dd.to ?? "En curso", pctText(dd.depth), `${dd.months} meses`]),
            {
              widths: [CONTENT_W * 0.2, CONTENT_W * 0.2, CONTENT_W * 0.22, CONTENT_W * 0.18, CONTENT_W * 0.2],
              align: ["left", "left", "left", "right", "right"],
            },
          );
        }
        if (adv.calendar.length) {
          R.subTitle("Rentabilidad por año natural");
          R.table(
            adv.benchmark ? ["Año", "Cartera", adv.benchmark.label] : ["Año", "Cartera"],
            adv.calendar.map((y) =>
              adv.benchmark
                ? [y.year, pctText(y.portfolio), y.benchmark === null ? "—" : pctText(y.benchmark)]
                : [y.year, pctText(y.portfolio)],
            ),
            adv.benchmark
              ? { widths: [CONTENT_W * 0.34, CONTENT_W * 0.33, CONTENT_W * 0.33] }
              : { widths: [CONTENT_W * 0.5, CONTENT_W * 0.5] },
          );
        }
      }
    }

    if (has("portfolio_benchmark")) {
      R.subTitle("Comparación contra índice de referencia");
      if (!adv.benchmark) {
        R.unavailable("No disponible — no hay histórico común suficiente entre tu cartera y el índice de referencia para calcular alfa, beta y tracking error.");
      } else {
        const b = adv.benchmark;
        R.paragraph(`Índice utilizado: ${b.label}${b.symbol ? ` (${b.symbol})` : ""} · ${b.from} — ${b.to} (${b.months} meses).`, {
          color: COLORS.slate,
        });
        R.kpiGrid(
          [
            { label: "Cartera anualizada", value: pctText(b.portfolioCagr) },
            { label: "Índice anualizado", value: pctText(b.benchmarkCagr) },
            { label: "Alfa de Jensen", value: `${signedPct(b.alpha)}%` },
            { label: "Beta", value: num(b.beta) },
            { label: "Tracking error", value: pctText(b.trackingError) },
            { label: "Information ratio", value: num(b.informationRatio) },
            { label: "Correlación / R²", value: `${dec(b.correlation, 2)} / ${dec(b.r2, 2)}` },
            { label: "Batting average", value: pctText(b.battingAverage) },
            { label: "Captura al alza", value: pctText(b.upCapture) },
            { label: "Captura a la baja", value: pctText(b.downCapture) },
            { label: "Volatilidad del índice", value: pctText(b.benchmarkVol) },
            { label: "Drawdown del índice", value: pctText(b.benchmarkMaxDrawdown) },
          ],
          4,
        );
        R.lineChart(
          "Crecimiento comparado de 100 €: tu cartera frente al índice",
          [
            { label: "Cartera", color: COLORS.forest, points: b.series.map((p) => ({ x: p.x, y: p.cartera })) },
            { label: b.label, color: COLORS.gold, points: b.series.map((p) => ({ x: p.x, y: p.indice })), dashed: true },
          ],
          { height: 140 },
        );
        R.paragraph(
          b.alpha >= 0
            ? `Tu cartera ha generado una alfa positiva de ${dec(b.alpha, 2)} puntos anuales frente a ${b.label}, con una beta de ${dec(b.beta, 2)} y una captura a la baja del ${dec(b.downCapture, 1)}%.`
            : `Tu cartera se ha quedado ${dec(Math.abs(b.alpha), 2)} puntos anuales por debajo de lo que explicaría su exposición a ${b.label} (beta ${dec(b.beta, 2)}), con una captura a la baja del ${dec(b.downCapture, 1)}%.`,
        );
      }
    }
  }

  /* --------------------- Divisas, costes y calidad ------------------------ */
  if (pf.available && (has("portfolio_costs") || has("portfolio_quality"))) {
    R.newPage();
    R.sectionTitle("Exposición, costes y calidad de la cartera", "Divisas, impacto de comisiones y puntuación global");
    if (has("portfolio_costs")) {
      if (adv.currencies.length) {
        R.subTitle("Exposición por divisa");
        R.table(
          ["Divisa", "Peso", "Importe"],
          adv.currencies.map((c) => [c.label, `${dec(c.weight * 100, 1)}%`, eur(c.value)]),
          { widths: [CONTENT_W * 0.34, CONTENT_W * 0.33, CONTENT_W * 0.33] },
        );
      }
      if (adv.costs) {
        R.subTitle("Impacto de los costes");
        R.kpiGrid(
          [
            { label: "Coste medio (TER)", value: pctText(adv.costs.terPct, 2) },
            { label: "Coste anual estimado", value: eur(adv.costs.annualCost) },
            { label: "Coste acumulado a 30 años", value: eur(adv.costs.totalCost) },
            { label: "Patrimonio perdido", value: pctText(adv.costs.finalGap) },
          ],
          4,
        );
        R.table(
          ["Horizonte", "Sin costes", "Con costes", "Diferencia"],
          adv.costs.rows.map((r) => [`${r.year} años`, eur(r.sinCostes), eur(r.conCostes), eur(r.coste)]),
          { widths: [CONTENT_W * 0.25, CONTENT_W * 0.25, CONTENT_W * 0.25, CONTENT_W * 0.25] },
        );
        R.note("El impacto de costes asume tu aportación mensual actual y la rentabilidad histórica de la cartera, sin considerar fiscalidad.");
      }
    }
    if (has("portfolio_quality") && adv.score) {
      R.subTitle(`Puntuación de calidad: ${adv.score.total}/100 (nota ${adv.score.grade})`);
      R.table(
        ["Criterio", "Puntuación", "Detalle"],
        adv.score.items.map((i) => [i.label, `${Math.round(i.score)} / ${i.max}`, i.detail]),
        { widths: [CONTENT_W * 0.3, CONTENT_W * 0.16, CONTENT_W * 0.54], align: ["left", "right", "left"] },
      );
    }
  }

  /* ---------------------------- Optimización ------------------------------ */
  if (has("portfolio_optimization")) {
    R.newPage();
    R.sectionTitle("Optimización de cartera", "Modelo de Markowitz sobre tus activos");
    const op = data.optimization;
    if (!op.available) {
      R.unavailable(op.reason ?? "No disponible — la optimización no se ha podido calcular con los datos actuales.");
    } else {
      R.table(
        ["Cartera", "Rentabilidad esperada", "Volatilidad", "Sharpe"],
        [
          ["Actual", pctText(op.current.er), pctText(op.current.vol), dec(op.current.sharpe, 2)],
          ["Máximo Sharpe", pctText(op.maxSharpe.er), pctText(op.maxSharpe.vol), dec(op.maxSharpe.sharpe, 2)],
          ["Mínima volatilidad", pctText(op.minVol.er), pctText(op.minVol.vol), dec(op.minVol.sharpe, 2)],
        ],
        { widths: [CONTENT_W * 0.34, CONTENT_W * 0.24, CONTENT_W * 0.2, CONTENT_W * 0.22], highlight: 1 },
      );
      R.subTitle("Pesos actuales frente a pesos recomendados (máximo Sharpe)");
      R.table(
        ["Activo", "Peso actual", "Peso recomendado", "Diferencia"],
        op.weights.map((w) => [
          w.ticker,
          `${dec(w.current * 100, 1)}%`,
          `${dec(w.target * 100, 1)}%`,
          `${signedPct(w.delta * 100)} pp`,
        ]),
        { widths: [CONTENT_W * 0.34, CONTENT_W * 0.22, CONTENT_W * 0.22, CONTENT_W * 0.22] },
      );
      if (op.frontier.length > 2) {
        R.lineChart(
          "Frontera eficiente (volatilidad vs rentabilidad esperada, %)",
          [{ label: "Frontera eficiente", color: COLORS.forest, points: op.frontier.map((p) => ({ x: p.vol, y: p.er })) }],
          { height: 130, xUnit: "%" },
        );
      }
      R.note("La cartera optimizada es una referencia cuantitativa del modelo, no una recomendación de inversión.");
    }
    if (has("risk_parity")) {
      R.subTitle("Cartera de paridad de riesgo (Risk Parity)");
      if (!data.advanced.riskParity.length) {
        R.unavailable("No disponible — la paridad de riesgo requiere al menos dos activos con histórico real.");
      } else {
        R.paragraph(
          "Reparto alternativo en el que cada activo aporta la misma contribución al riesgo total de la cartera, en lugar de igualar importes.",
          { color: COLORS.slate },
        );
        R.table(
          ["Activo", "Peso actual", "Peso paridad de riesgo", "Diferencia"],
          data.advanced.riskParity.map((w) => [
            w.ticker,
            `${dec(w.current * 100, 1)}%`,
            `${dec(w.target * 100, 1)}%`,
            `${signedPct(w.delta * 100)} pp`,
          ]),
          { widths: [CONTENT_W * 0.34, CONTENT_W * 0.22, CONTENT_W * 0.22, CONTENT_W * 0.22] },
        );
      }
    }
  }

  /* ------------------------------ Escenarios ------------------------------ */
  if (has("scenario_analysis")) {
    R.newPage();
    R.sectionTitle("Escenarios financieros", "Impacto estimado de cada estrategia al final del horizonte");
    const rows = data.scenarios.map((s) => [
      s.name.replace(/^Escenario ([A-D]) — /, "$1 · "),
      eur(s.netWorth),
      eur(s.netAfterTax),
      eur(s.portfolio),
      eur(s.interest),
      s.payoffLabel,
    ]);
    const highlight = data.scenarios.findIndex((s) => s.id === data.currentStrategyId);
    R.table(
      ["Estrategia", "Patrimonio neto", "Neto tras impuestos", "Cartera final", "Intereses", "Cancelación"],
      rows,
      {
        widths: [CONTENT_W * 0.3, CONTENT_W * 0.15, CONTENT_W * 0.16, CONTENT_W * 0.15, CONTENT_W * 0.12, CONTENT_W * 0.12],
        align: ["left", "right", "right", "right", "right", "right"],
        ...(highlight >= 0 ? { highlight } : {}),
      },
    );
    R.barChart(
      "Patrimonio neto después de impuestos por escenario",
      data.scenarios.map((s) => ({
        label: s.name.replace(/^Escenario [A-D] — /, ""),
        value: Math.max(0, s.netAfterTax),
        color: s.id === data.currentStrategyId ? COLORS.gold : COLORS.forest,
      })),
    );
    R.note("La fila destacada corresponde a tu estrategia actual configurada en Prestafin. Los importes proceden del motor de cálculo con tus datos y supuestos.");
  }

  /* ----------------------- Simulaciones y proyección ---------------------- */
  if (has("monte_carlo") || has("advanced_projections")) {
    R.newPage();
    R.sectionTitle("Simulaciones y proyecciones", "Rutas probabilísticas y evolución patrimonial");
    const mc = data.monteCarlo;
    if (has("monte_carlo")) {
      if (!mc.available) {
        R.unavailable("No disponible — la simulación Monte Carlo requiere una cartera con histórico real de rentabilidad y volatilidad.");
      } else {
        R.kpiGrid(
          [
            { label: "Simulaciones", value: mc.paths.toLocaleString("es-ES") },
            { label: "Horizonte", value: `${mc.horizonYears} años` },
            { label: "Capital inicial", value: eur(mc.initialCapital) },
            { label: "Aportación mensual", value: eur(mc.monthly) },
            { label: "Rentabilidad usada", value: pctText(mc.er) },
            { label: "Volatilidad usada", value: pctText(mc.vol) },
            { label: "Escenario central (P50)", value: eur(mc.p50) },
            { label: "Prob. cubrir la deuda", value: `${Math.round(mc.successRate * 100)}%` },
          ],
          4,
        );
        R.lineChart("Monte Carlo — percentiles del patrimonio invertido", [
          { label: "P90 optimista", color: COLORS.gain, points: mc.data.map((p) => ({ x: p.year, y: p.p90 })) },
          { label: "P50 central", color: COLORS.forest, points: mc.data.map((p) => ({ x: p.year, y: p.p50 })), area: true },
          { label: "P10 pesimista", color: COLORS.gold, points: mc.data.map((p) => ({ x: p.year, y: p.p10 })) },
          { label: "Deuda", color: COLORS.debt, points: mc.data.map((p) => ({ x: p.year, y: p.debt })), dashed: true },
        ]);
        R.paragraph(
          `La simulación muestra un rango de patrimonio invertido entre ${eur(mc.p10)} y ${eur(mc.p90)} al final del horizonte, con ${eur(mc.p50)} como escenario central.`,
        );
      }
    }
    if (has("advanced_projections")) {
      R.lineChart("Proyección patrimonial: deuda, cartera y patrimonio neto", [
        { label: "Cartera + liquidez", color: COLORS.gain, points: data.projection.map((p) => ({ x: p.year, y: p.portfolio })), area: true },
        { label: "Deuda", color: COLORS.debt, points: data.projection.map((p) => ({ x: p.year, y: p.debt })) },
        { label: "Patrimonio neto", color: COLORS.forest, points: data.projection.map((p) => ({ x: p.year, y: Math.max(0, p.net) })), dashed: true },
      ]);
    }
  }

  /* ------------------------------- Plan ---------------------------------- */
  R.newPage();
  R.sectionTitle("Tu plan de acción", "De los datos analizados a decisiones concretas");
  for (const block of data.actionPlan) {
    R.subTitle(block.horizon);
    R.bullets(block.items);
  }
  R.subTitle("Variables a monitorizar");
  R.bullets(data.monitor, COLORS.debt);

  /* ---------------------------- Conclusiones ------------------------------ */
  R.sectionTitle("Conclusión ejecutiva");
  data.conclusion.forEach((p) => R.paragraph(p));

  R.subTitle("Supuestos utilizados");
  R.table(
    ["Supuesto", "Valor"],
    data.assumptions.map((a) => [a.label, a.value]),
    { widths: [CONTENT_W * 0.62, CONTENT_W * 0.38] },
  );

  /* ------------------------------ Upgrade -------------------------------- */
  if (has("upgrade_note") && data.plan !== "pro") {
    const hints = UPGRADE_HINTS[data.plan as "free" | "premium"];
    R.ensure(90);
    R.subTitle("¿Quieres un análisis más avanzado?");
    R.paragraph(
      "Tu plan actual cubre las secciones incluidas en este documento. Con un plan superior, tu próximo informe podría incorporar:",
      { color: COLORS.slate },
    );
    R.bullets(hints, COLORS.gold);
  }

  /* ----------------------------- Disclaimer ------------------------------- */
  R.ensure(86);
  R.subTitle("Aviso importante");
  R.paragraph(
    "Prestafin proporciona herramientas de análisis, simulación y planificación financiera con fines informativos y educativos. Las proyecciones y simulaciones se basan en los datos introducidos y en las hipótesis utilizadas por los modelos y no garantizan resultados futuros. El informe no constituye asesoramiento financiero, fiscal, legal ni de inversión personalizado.",
    { size: 8.6, color: COLORS.slate },
  );

  /* -------------------- Encabezados y pies de página --------------------- */
  const pages = d.getNumberOfPages();
  for (let p = 2; p <= pages; p++) {
    d.setPage(p);
    d.setDrawColor(COLORS.line[0], COLORS.line[1], COLORS.line[2]);
    d.setLineWidth(0.5);
    d.line(M, M - 14, A4.w - M, M - 14);
    d.setFont("helvetica", "bold");
    d.setFontSize(7.6);
    d.setTextColor(COLORS.navy[0], COLORS.navy[1], COLORS.navy[2]);
    d.text("Prestafin — Informe Ejecutivo", M, M - 22);
    d.setFont("helvetica", "normal");
    d.setTextColor(COLORS.slate[0], COLORS.slate[1], COLORS.slate[2]);
    d.text(data.planName.toUpperCase(), A4.w - M, M - 22, { align: "right" });

    d.line(M, A4.h - M + 6, A4.w - M, A4.h - M + 6);
    d.setFontSize(7.2);
    d.text("Prestafin.tech", M, A4.h - M + 18);
    d.text(`Informe generado el ${dateLabel}`, A4.w / 2, A4.h - M + 18, { align: "center" });
    d.text(`Página ${p} de ${pages}`, A4.w - M, A4.h - M + 18, { align: "right" });
  }

  return R.d;
}

export function reportFileName(data: ReportData): string {
  const date = new Date(data.generatedAt).toISOString().slice(0, 10);
  const first = data.userName?.trim().split(/\s+/)[0];
  const clean = first
    ? first
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Za-z0-9]/g, "")
    : "";
  return clean
    ? `Prestafin_Informe_Ejecutivo_${clean}_${date}.pdf`
    : `Prestafin_Informe_Ejecutivo_${date}.pdf`;
}
