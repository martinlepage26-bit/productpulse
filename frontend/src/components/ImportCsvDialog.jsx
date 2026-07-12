import React, { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import API from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Download, Loader2, CheckCircle2, AlertTriangle, RotateCcw } from "lucide-react";

const HEADER_ALIASES = {
  product_name: ["product_name", "product", "product name", "item"],
  raw_message: ["raw_message", "message", "customer_message", "customer message", "complaint", "review"],
  platform: ["platform", "channel", "marketplace"],
  source: ["source", "complaint_source", "complaint source", "type"],
  internal_notes: ["internal_notes", "notes", "note", "internal notes"],
};

const TEMPLATE = `product_name,platform,source,message,notes
Wireless Earbuds,TikTok Shop,Return request,"Left earbud stopped working after four days of light use.",
Yoga Mat,Amazon,Review,"Mat is much thinner than the photos suggest, my knees hurt.",
Phone Charger,Shopify,Support chat,"Cable frayed at the plug and died within a week.",
`;

function mapRow(raw) {
  const lower = {};
  Object.keys(raw).forEach((k) => { lower[k.trim().toLowerCase()] = (raw[k] || "").toString().trim(); });
  const pick = (field) => {
    for (const alias of HEADER_ALIASES[field]) {
      if (lower[alias]) return lower[alias];
    }
    return "";
  };
  return {
    product_name: pick("product_name"),
    platform: pick("platform") || "Other",
    source: pick("source") || "Review",
    raw_message: pick("raw_message"),
    internal_notes: pick("internal_notes"),
  };
}

export const ImportCsvDialog = ({ onCompleted }) => {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState("pick"); // pick | ready | running | done
  const [rows, setRows] = useState([]);
  const [skipped, setSkipped] = useState(0);
  const [fileName, setFileName] = useState("");
  const [job, setJob] = useState(null);
  const fileRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const reset = () => {
    clearInterval(pollRef.current);
    setPhase("pick");
    setRows([]);
    setSkipped(0);
    setFileName("");
    setJob(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const mapped = res.data.map(mapRow);
        const valid = mapped.filter((r) => r.product_name && r.raw_message);
        setSkipped(mapped.length - valid.length);
        if (valid.length === 0) {
          toast.error("No valid rows found. Each row needs a product name and a message.");
          reset();
          return;
        }
        if (valid.length > 30) {
          toast.warning("Import capped at 30 rows — taking the first 30.");
        }
        setRows(valid.slice(0, 30));
        setPhase("ready");
      },
      error: () => {
        toast.error("Could not parse that CSV file.");
        reset();
      },
    });
  };

  const startImport = async () => {
    setPhase("running");
    try {
      const res = await API.post("/imports", { rows });
      const jobId = res.data.id;
      setJob(res.data);
      pollRef.current = setInterval(async () => {
        try {
          const r = await API.get(`/imports/${jobId}`);
          setJob(r.data);
          if (r.data.status === "completed" || r.data.status === "failed") {
            clearInterval(pollRef.current);
            setPhase("done");
            if (r.data.status === "completed") {
              toast.success(`Import complete — ${r.data.succeeded} insight${r.data.succeeded === 1 ? "" : "s"} created`);
              if ("Notification" in window && Notification.permission === "granted") {
                navigator.serviceWorker?.ready.then((reg) =>
                  reg.showNotification("ProductPulse AI", {
                    body: `CSV import complete: ${r.data.succeeded} insights created.`,
                    icon: "/icons/icon-192.png",
                    badge: "/icons/icon-192.png",
                  })
                ).catch(() => {});
              }
              onCompleted && onCompleted();
            } else {
              toast.error("Import failed. See details in the dialog.");
            }
          }
        } catch {
          /* keep polling */
        }
      }, 2500);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to start import");
      setPhase("ready");
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "productpulse_complaints_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const progressPct = job && job.total ? Math.round((job.processed / job.total) * 100) : 5;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-lg font-semibold" data-testid="import-csv-button">
          <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-xl bg-card">
        <DialogHeader>
          <DialogTitle className="font-bold">Import complaints from CSV</DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Each row is analyzed by AI and saved as an insight — updating product health, recommendations, and alerts.
            Required columns: <span className="font-semibold text-foreground">product_name, message</span>.
            Optional: platform, source, notes. Max 30 rows.
          </DialogDescription>
        </DialogHeader>

        {phase === "pick" && (
          <div className="space-y-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors p-8 flex flex-col items-center gap-2"
              data-testid="import-dropzone"
            >
              <Upload className="h-6 w-6 text-primary" />
              <p className="text-sm font-bold text-foreground">Choose a CSV file</p>
              <p className="text-[11px] text-muted-foreground">Click to browse your files</p>
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} data-testid="import-file-input" />
            <Button variant="ghost" size="sm" className="w-full rounded-lg font-semibold text-primary" onClick={downloadTemplate} data-testid="import-download-template">
              <Download className="h-3.5 w-3.5 mr-1.5" /> Download template
            </Button>
          </div>
        )}

        {phase === "ready" && (
          <div className="space-y-3">
            <div className="rounded-lg bg-secondary/70 border border-border px-4 py-3" data-testid="import-preview">
              <p className="text-xs font-bold text-foreground">{fileName}</p>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-bold text-foreground">{rows.length}</span> valid row{rows.length === 1 ? "" : "s"} ready to import
                {skipped > 0 && <span> · {skipped} skipped (missing product or message)</span>}
              </p>
              <ul className="mt-2 space-y-1">
                {rows.slice(0, 3).map((r, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground truncate">• {r.product_name}: “{r.raw_message.slice(0, 60)}…”</li>
                ))}
                {rows.length > 3 && <li className="text-[11px] text-muted-foreground">…and {rows.length - 3} more</li>}
              </ul>
            </div>
            <p className="text-[11px] text-muted-foreground">AI analysis takes roughly 10–20 seconds per batch of 6 rows.</p>
            <div className="flex gap-2">
              <Button className="flex-1 h-11 rounded-xl font-bold" onClick={startImport} data-testid="import-start-button">
                <Upload className="h-4 w-4 mr-2" /> Import {rows.length} row{rows.length === 1 ? "" : "s"}
              </Button>
              <Button variant="outline" className="h-11 rounded-xl font-semibold" onClick={reset} data-testid="import-reset-button">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {phase === "running" && (
          <div className="space-y-4 py-2" data-testid="import-progress">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
              <div>
                <p className="text-sm font-bold text-foreground">Analyzing complaints…</p>
                <p className="text-xs text-muted-foreground">{job ? `${job.processed} of ${job.total} processed` : "Starting…"}</p>
              </div>
            </div>
            <Progress value={progressPct} className="h-2" />
            <p className="text-[11px] text-muted-foreground">You can keep this dialog open — each row updates product health as it lands.</p>
          </div>
        )}

        {phase === "done" && job && (
          <div className="space-y-3" data-testid="import-summary">
            <div className={`rounded-lg px-4 py-3 border flex items-start gap-2.5 ${job.status === "completed" ? "bg-[hsl(var(--pp-success-bg))] border-[hsl(var(--pp-success))]/25" : "bg-[hsl(var(--pp-critical-bg))] border-[hsl(var(--pp-critical))]/25"}`}>
              {job.status === "completed"
                ? <CheckCircle2 className="h-5 w-5 text-[hsl(142_72%_29%)] shrink-0 mt-0.5" />
                : <AlertTriangle className="h-5 w-5 text-[hsl(0_74%_42%)] shrink-0 mt-0.5" />}
              <div>
                <p className="text-sm font-bold text-foreground">
                  {job.status === "completed" ? "Import complete" : "Import failed"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {job.succeeded} insight{job.succeeded === 1 ? "" : "s"} created{job.failed > 0 ? ` · ${job.failed} row${job.failed === 1 ? "" : "s"} failed` : ""}
                </p>
              </div>
            </div>
            {job.errors?.length > 0 && (
              <div className="rounded-lg bg-secondary/70 border border-border px-3 py-2 max-h-24 overflow-y-auto">
                {job.errors.slice(0, 4).map((e, i) => (
                  <p key={i} className="text-[11px] text-muted-foreground">Row {e.row}: {e.error}</p>
                ))}
              </div>
            )}
            <Button className="w-full h-11 rounded-xl font-bold" onClick={() => { setOpen(false); reset(); }} data-testid="import-done-button">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
