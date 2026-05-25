import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "blue";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm disabled:opacity-50",
  blue: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm disabled:opacity-50",
  secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm disabled:opacity-50",
  ghost: "text-gray-600 hover:bg-gray-100 disabled:opacity-50",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

const baseField =
  "block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500";

export function Field({
  label,
  children,
  className = "",
}: {
  label?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      {children}
    </div>
  );
}

export function TextInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${baseField} ${className}`} {...props} />;
}

export function TextArea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${baseField} ${className}`} {...props} />;
}

export function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${baseField} ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 text-gray-500">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
