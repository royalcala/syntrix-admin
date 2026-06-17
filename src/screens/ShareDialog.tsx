import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "../components/ui/button";
import { Share2, Copy, Check } from "lucide-react";

export function ShareDialog({ org }: { org: string }) {
  const [tickets, setTickets] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function share() {
    const t: string[] = await invoke("share_org", { org });
    setTickets(t);
    setOpen(true);
  }

  async function copyAll() {
    await navigator.clipboard.writeText(tickets.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={share}>
        <Share2 size={16} /> Share
      </Button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Share {org}</h3>
            <p className="text-sm text-muted mb-4">Share these tickets with users to invite them to the org.</p>

            <div className="space-y-3 mb-4">
              {tickets.map((t, i) => (
                <div key={i} className="bg-zinc-50 rounded-lg p-3">
                  <p className="text-xs text-muted mb-1">{i === 0 ? "Control doc" : "Data doc"}</p>
                  <code className="text-xs font-mono break-all">{t}</code>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Close</Button>
              <Button size="sm" onClick={copyAll}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied" : "Copy all"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
