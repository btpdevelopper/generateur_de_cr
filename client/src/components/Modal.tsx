import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** Optional icon shown left of the title. */
  icon?: ReactNode;
  subtitle?: ReactNode;
  /** Tailwind max-width class, e.g. "max-w-2xl". */
  maxWidth?: string;
  /** Footer content (e.g. action buttons). */
  footer?: ReactNode;
  children: ReactNode;
  /** When true the body grows and scrolls inside a fixed-height shell. */
  tall?: boolean;
}

/**
 * Generic modal shell. Mirrors the look of the legacy modals
 * (rounded-2xl, dark overlay, sticky header/footer).
 */
export default function Modal({
  open,
  onClose,
  title,
  icon,
  subtitle,
  maxWidth = "max-w-2xl",
  footer,
  children,
  tall = false,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("overflow-hidden");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("overflow-hidden");
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`flex w-full ${maxWidth} flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${
          tall ? "h-[85vh]" : "max-h-[90vh]"
        }`}
      >
        {(title || icon) && (
          <div className="flex flex-none items-start justify-between border-b border-gray-100 px-6 py-5">
            <div className="flex items-center gap-3">
              {icon}
              <div>
                {title && (
                  <h2 className="text-xl font-bold text-gray-800">{title}</h2>
                )}
                {subtitle && (
                  <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              title="Fermer"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        )}

        <div
          className={`custom-scrollbar overflow-y-auto ${
            tall ? "flex-grow" : ""
          } bg-gray-50/30`}
        >
          {children}
        </div>

        {footer && (
          <div className="flex flex-none items-center justify-between border-t border-gray-200 bg-white p-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
