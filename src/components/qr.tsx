import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QrImage({ value, size = 120 }: { value: string; size?: number }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    QRCode.toDataURL(value, { margin: 1, width: size * 2 }).then(setSrc);
  }, [value, size]);
  return src ? (
    <img src={src} width={size} height={size} alt={`QR ${value}`} />
  ) : (
    <div style={{ width: size, height: size }} />
  );
}

/** Abre a câmera e devolve o texto lido (patrimônio). */
export function QrScanner({
  onRead,
  label = "Ler QR",
}: {
  onRead: (txt: string) => void;
  label?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onRead);
  cb.current = onRead;

  useEffect(() => {
    if (!aberto) return;
    let scanner: { stop: () => Promise<void>; clear: () => void } | null = null;
    let ultimo = "";
    let parado = false;
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (parado || !ref.current) return;
      const s = new Html5Qrcode("qr-leitor");
      scanner = s;
      try {
        await s.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 220 },
          (txt) => {
            if (txt === ultimo) return;
            ultimo = txt;
            setTimeout(() => (ultimo = ""), 2000);
            cb.current(txt.replace(/^MS:/, ""));
          },
          () => {},
        );
      } catch {
        alert("Não foi possível abrir a câmera. Verifique a permissão do navegador.");
        setAberto(false);
      }
    })();
    return () => {
      parado = true;
      scanner
        ?.stop()
        .then(() => scanner?.clear())
        .catch(() => {});
    };
  }, [aberto]);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={() => setAberto(true)}
        className="h-14 gap-2 text-base"
      >
        <Camera className="h-5 w-5" /> {label}
      </Button>
      {aberto && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-lg font-bold">Aponte para o QR do equipamento</p>
              <Button size="icon" variant="ghost" onClick={() => setAberto(false)}>
                <X />
              </Button>
            </div>
            <div id="qr-leitor" ref={ref} className="overflow-hidden rounded-xl" />
            <p className="mt-3 text-center text-sm text-muted-foreground">
              A câmera continua aberta para ler vários seguidos.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
