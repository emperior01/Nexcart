import { useRef, useState } from "react";
import { Camera, Link2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/index";
import { toast } from "sonner";
import { uploadImageToStorage, resolveImageUrl } from "@/lib/image-upload";

/**
 * Shared image picker used everywhere in the app that lets someone provide
 * a single image — admin product images, seller product images, and each
 * homepage hero slide. One implementation, one fix applies everywhere.
 */
export function ImagePicker({
  value,
  onChange,
  folder,
  height = 140,
}: {
  value: string;
  onChange: (url: string) => void;
  /** Storage path prefix, e.g. "admin", "sellers/<id>", or "hero". */
  folder: string;
  /** Preview height in px. */
  height?: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState(value.startsWith("http") ? value : "");
  const [urlValidating, setUrlValidating] = useState(false);
  const [tab, setTab] = useState<"upload" | "url">("upload");

  const preview = value.startsWith("http") ? value : null;

  async function uploadAndApply(file: File) {
    setUploading(true);
    try {
      const url = await uploadImageToStorage(file, folder);
      onChange(url);
      setUrlInput("");
      toast.success("Image uploaded!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAndApply(file);
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          uploadAndApply(file);
        }
        return;
      }
    }
    // No image found in clipboard — if there's text, let it fall through
    // naturally (e.g. pasting into the URL field still works as normal).
  }

  async function handleUrlApply() {
    if (!urlInput.trim()) { onChange(""); return; }
    setUrlValidating(true);
    const result = await resolveImageUrl(urlInput);
    setUrlValidating(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    onChange(result.url);
  }

  return (
    <div
      tabIndex={0}
      onPaste={handlePaste}
      style={{ display: "flex", flexDirection: "column", gap: 10, outline: "none" }}
    >
      <div style={{ display: "flex", borderRadius: 10, background: "#F3F4F6", padding: 3, gap: 2 }}>
        {(["upload", "url"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "6px 0", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 700,
              background: tab === t ? "#fff" : "transparent",
              color: tab === t ? "#E8611A" : "#6B7280",
              boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            }}
          >
            {t === "upload" ? <Camera style={{ width: 12, height: 12 }} /> : <Link2 style={{ width: 12, height: 12 }} />}
            {t === "upload" ? "Upload from Device" : "Paste URL"}
          </button>
        ))}
      </div>

      {tab === "upload" ? (
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          style={{
            border: "2px dashed #E5E7EB", borderRadius: 12, padding: "20px 16px",
            textAlign: "center", cursor: uploading ? "not-allowed" : "pointer",
            background: uploading ? "#F9FAFB" : "#FAFAFA",
            transition: "border-color 0.2s",
          }}
          onMouseEnter={(e) => { if (!uploading) (e.currentTarget as HTMLDivElement).style.borderColor = "#E8611A"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#E5E7EB"; }}
        >
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          {uploading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ width: 24, height: 24, border: "3px solid #E8611A", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <p style={{ fontSize: 12, color: "#6B7280" }}>Uploading…</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#FEF0E8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Camera style={{ width: 18, height: 18, color: "#E8611A" }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#3A3A3A" }}>Tap to choose photo</p>
              <p style={{ fontSize: 11, color: "#9B9B9B" }}>JPG, PNG, WEBP · max 5 MB</p>
              <p style={{ fontSize: 11, color: "#9B9B9B" }}>or paste a copied image (Ctrl/Cmd+V)</p>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/image.jpg"
              onKeyDown={(e) => e.key === "Enter" && handleUrlApply()}
              disabled={urlValidating}
              style={{ flex: 1 }}
            />
            <Button type="button" onClick={handleUrlApply} variant="outline" disabled={urlValidating} style={{ flexShrink: 0 }}>
              {urlValidating ? "Checking…" : "Apply"}
            </Button>
          </div>
          <p style={{ fontSize: 11, color: "#9CA3AF" }}>
            Paste a direct image link — we'll check it loads before saving.
          </p>
        </div>
      )}

      {preview && (
        <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid #E5E7EB", height }}>
          <img src={preview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <button
            type="button"
            onClick={() => { onChange(""); setUrlInput(""); }}
            style={{
              position: "absolute", top: 8, right: 8,
              width: 26, height: 26, borderRadius: "50%",
              background: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X style={{ width: 14, height: 14, color: "#fff" }} />
          </button>
        </div>
      )}
    </div>
  );
}
