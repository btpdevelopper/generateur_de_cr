import {
  User,
  HardHat,
  Briefcase,
  AlertTriangle,
  Circle,
  type LucideProps,
} from "lucide-react";

// Maps the legacy lucide icon-name strings (from originStyles) to components.
const map: Record<string, React.ComponentType<LucideProps>> = {
  user: User,
  "hard-hat": HardHat,
  briefcase: Briefcase,
  "alert-triangle": AlertTriangle,
};

export function OriginIcon({
  icon,
  className,
}: {
  icon: string;
  className?: string;
}) {
  const Cmp = map[icon] || Circle;
  return <Cmp className={className} />;
}
