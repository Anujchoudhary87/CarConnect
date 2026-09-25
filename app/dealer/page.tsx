import type { Metadata } from "next";
import Link from "next/link";
import { requireDealer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink, Card } from "@/components/ui";

export const metadata: Metadata = { title: "Dealer Dashboard" };

type IconName =
  | "activity"
  | "arrow"
  | "calendar"
  | "car"
  | "chart"
  | "demand"
  | "fuel"
  | "inbox"
  | "list"
  | "message"
  | "offer"
  | "plus"
  | "profile"
  | "tag";

type DashboardVehicle = {
  id: string;
  brand: string;
  model: string;
  status: string;
  fuel: string;
  created_at: string;
  updated_at: string;
};

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
  icon: IconName;
  href: string;
};

type TrendPoint = {
  label: string;
  value: number;
};

const numberFormatter = new Intl.NumberFormat("en-IN");

function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, string> = {
    activity: "M3 12h4l2-7 4 14 2-7h6",
    arrow: "M5 12h14m-6-6 6 6-6 6",
    calendar: "M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm3 8h3m-3 4h3m2-4h3m-3 4h3",
    car: "M5 17h14m-1 0 1-5H6l-1 5m2 0v2m10-2v2M7 14h.01M17 14h.01",
    chart: "M4 19V5m0 14h16M8 16v-4m4 4V8m4 8v-6",
    demand: "M4 18 9 12l3 3 7-8M15 7h4v4",
    fuel: "M6 20V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15M4 20h14M8 7h6M16 8l2 2v6a2 2 0 0 0 4 0V9l-3-3",
    inbox: "M4 5h16v14H4zM4 14h4l1.5 2h5L16 14h4",
    list: "M8 6h11M8 12h11M8 18h11M4 6h.01M4 12h.01M4 18h.01",
    message: "M4 5h16v11H8l-4 4V5Zm4 4h8m-8 3h5",
    offer: "M20 13 13 20l-9-9V4h7l9 9ZM7 8h.01",
    plus: "M12 5v14m-7-7h14",
    profile: "M20 21a8 8 0 0 0-16 0m12-13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
    tag: "m20 13-7 7-11-11V4h5l13 9ZM8 8h.01",
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon: IconName;
  tone: "brand" | "green" | "blue" | "amber" | "stone";
}) {
  const toneClasses = {
    brand: "bg-brand/10 text-brand-dark",
    green: "bg-emerald-100 text-emerald-700",
    blue: "bg-sky-100 text-sky-700",
    amber: "bg-amber-100 text-amber-700",
    stone: "bg-stone-100 text-stone-700",
  } as const;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">{label}</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">{formatNumber(value)}</p>
          <p className="mt-1 text-xs text-stone-500">{detail}</p>
        </div>
        <span className={`rounded-xl p-2.5 ${toneClasses[tone]}`}>
          <Icon name={icon} />
        </span>
      </div>
    </Card>
  );
}

function QuickAction({
  href,
  title,
  description,
  icon,
  accent,
}: {
  href: string;
  title: string;
  description: string;
  icon: IconName;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[104px] flex-col justify-between rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <span className={`inline-flex w-fit rounded-lg p-2 ${accent}`}>
        <Icon name={icon} className="size-4" />
      </span>
      <span className="mt-3 flex items-end justify-between gap-2">
        <span>
          <span className="block text-sm font-bold text-stone-900">{title}</span>
          <span className="mt-0.5 block text-xs text-stone-500">{description}</span>
        </span>
        <Icon name="arrow" className="size-4 shrink-0 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-brand" />
      </span>
    </Link>
  );
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h2 className="text-base font-bold text-stone-900">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-stone-500">{description}</p>}
    </div>
  );
}

function StatusChart({ active, sold, other }: { active: number; sold: number; other: number }) {
  const total = active + sold + other;
  const segments = [
    { label: "Active", value: active, className: "bg-emerald-500" },
    { label: "Sold", value: sold, className: "bg-brand" },
    { label: "Other", value: other, className: "bg-stone-300" },
  ];
  const colors = { Active: "bg-emerald-500", Sold: "bg-brand", Other: "bg-stone-300" } as const;

  return (
    <div>
      {total > 0 ? (
        <div className="flex h-4 overflow-hidden rounded-full bg-stone-100" aria-label="Inventory status distribution">
          {segments.map((segment) => (
            <div
              key={segment.label}
              className={segment.className}
              style={{ width: `${(segment.value / total) * 100}%` }}
              title={`${segment.label}: ${formatNumber(segment.value)}`}
            />
          ))}
        </div>
      ) : (
        <div className="h-4 rounded-full bg-stone-100" />
      )}
      <div className="mt-5 grid grid-cols-3 gap-3">
        {segments.map((segment) => (
          <div key={segment.label}>
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <span className={`size-2 rounded-full ${colors[segment.label as keyof typeof colors]}`} />
              {segment.label}
            </div>
            <p className="mt-1 text-lg font-bold text-stone-900">{formatNumber(segment.value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendChart({ data }: { data: TrendPoint[] }) {
  const width = 640;
  const height = 190;
  const padding = { top: 18, right: 18, bottom: 30, left: 18 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const max = Math.max(...data.map((point) => point.value), 1);
  const points = data
    .map((point, index) => {
      const x = padding.left + (data.length === 1 ? chartWidth / 2 : (index / (data.length - 1)) * chartWidth);
      const y = padding.top + chartHeight - (point.value / max) * chartHeight;
      return { x, y, point };
    })
    .filter(({ x, y }) => Number.isFinite(x) && Number.isFinite(y));
  const polyline = points.map(({ x, y }) => `${x},${y}`).join(" ");

  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full" role="img" aria-label="Customer leads over the last seven days">
          {[0, 1, 2, 3].map((line) => {
            const y = padding.top + (line / 3) * chartHeight;
            return <line key={line} x1={padding.left} x2={width - padding.right} y1={y} y2={y} className="stroke-stone-200" strokeDasharray="4 5" />;
          })}
          {points.length > 0 && <polyline points={polyline} fill="none" className="stroke-brand" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
          {points.map(({ x, y, point }) => (
            <g key={point.label}>
              <circle cx={x} cy={y} r="5" className="fill-white stroke-brand" strokeWidth="3" />
              <text x={x} y={height - 7} textAnchor="middle" className="fill-stone-400 text-[11px]">
                {point.label}
              </text>
            </g>
          ))}
        </svg>
        {data.every((point) => point.value === 0) && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-stone-500">No recent lead activity</span>
          </div>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-stone-500">
        <span>Enquiries + test drives</span>
        <span>Peak: {formatNumber(Math.max(...data.map((point) => point.value), 0))}</span>
      </div>
    </div>
  );
}

function FuelChart({ counts }: { counts: Array<{ label: string; value: number }> }) {
  const max = Math.max(...counts.map((item) => item.value), 1);
  const fuelClasses: Record<string, string> = {
    Petrol: "bg-orange-400",
    Diesel: "bg-slate-500",
    CNG: "bg-emerald-500",
    Electric: "bg-sky-500",
    Hybrid: "bg-violet-500",
    LPG: "bg-amber-400",
  };

  if (counts.length === 0) {
    return <p className="py-8 text-center text-sm text-stone-500">No inventory fuel data yet.</p>;
  }

  return (
    <div className="space-y-4">
      {counts.map((item) => (
        <div key={item.label}>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-stone-600">{item.label}</span>
            <span className="font-bold text-stone-900">{formatNumber(item.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-stone-100">
            <div className={`h-full rounded-full ${fuelClasses[item.label] ?? "bg-brand"}`} style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityList({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-stone-500">Jab activity hogi, yahan dikhegi.</p>;
  }

  return (
    <div className="divide-y divide-stone-100">
      {items.map((item) => (
        <Link key={`${item.icon}-${item.id}`} href={item.href} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:bg-stone-50">
          <span className="rounded-lg bg-stone-100 p-2 text-stone-600">
            <Icon name={item.icon} className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-stone-800">{item.title}</span>
            <span className="mt-0.5 block truncate text-xs text-stone-500">{item.detail}</span>
          </span>
          <span className="shrink-0 text-[11px] text-stone-400">{formatRelativeTime(item.createdAt)}</span>
        </Link>
      ))}
    </div>
  );
}

export default async function DealerDashboardPage() {
  const { dealer } = await requireDealer();
  const supabase = await createClient();

  const [vehicleRowsResult, totalResult, activeResult, soldResult, enquiriesResult, drivesResult, offersResult] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, brand, model, status, fuel, created_at, updated_at")
      .eq("dealer_id", dealer.id)
      .order("updated_at", { ascending: false }),
    supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("dealer_id", dealer.id),
    supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("dealer_id", dealer.id).eq("status", "active"),
    supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("dealer_id", dealer.id).eq("status", "sold"),
    supabase
      .from("enquiries")
      .select("id, created_at, type", { count: "exact" })
      .eq("dealer_id", dealer.id)
      .neq("type", "test_drive")
      .order("created_at", { ascending: false }),
    supabase
      .from("test_drive_requests")
      .select("id, created_at, status", { count: "exact" })
      .eq("dealer_id", dealer.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("dealer_offers")
      .select("id, created_at, status", { count: "exact" })
      .eq("dealer_id", dealer.id)
      .order("created_at", { ascending: false }),
  ]);

  const vehicles = (vehicleRowsResult.data ?? []) as DashboardVehicle[];
  const enquiries = (enquiriesResult.data ?? []) as Array<{ id: string; created_at: string; type: string }>;
  const drives = (drivesResult.data ?? []) as Array<{ id: string; created_at: string; status: string }>;
  const offers = (offersResult.data ?? []) as Array<{ id: string; created_at: string; status: string }>;
  const total = totalResult.count ?? vehicles.length;
  const active = activeResult.count ?? vehicles.filter((vehicle) => vehicle.status === "active").length;
  const sold = soldResult.count ?? vehicles.filter((vehicle) => vehicle.status === "sold").length;
  const other = Math.max(total - active - sold, 0);
  const hasQueryError = Boolean(
    vehicleRowsResult.error ||
      totalResult.error ||
      activeResult.error ||
      soldResult.error ||
      enquiriesResult.error ||
      drivesResult.error ||
      offersResult.error,
  );

  const fuelCounts = Object.entries(
    vehicles.reduce<Record<string, number>>((counts, vehicle) => {
      const fuel = vehicle.fuel || "Other";
      counts[fuel] = (counts[fuel] ?? 0) + 1;
      return counts;
    }, {}),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const trend: TrendPoint[] = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    const countForDay = (rows: Array<{ created_at: string }>) =>
      rows.filter((row) => new Date(row.created_at).toISOString().slice(0, 10) === key).length;
    return {
      label: date.toLocaleDateString("en-IN", { weekday: "short" }),
      value: countForDay(enquiries) + countForDay(drives),
    };
  });

  const activities: ActivityItem[] = [
    ...vehicles.slice(0, 6).map((vehicle) => ({
      id: vehicle.id,
      title: `${vehicle.brand} ${vehicle.model}`,
      detail: vehicle.status === "sold" ? "Marked sold" : vehicle.created_at === vehicle.updated_at ? "New car listed" : "Inventory updated",
      createdAt: vehicle.updated_at,
      icon: "car" as IconName,
      href: "/dealer/cars",
    })),
    ...enquiries.slice(0, 6).map((enquiry) => ({
      id: enquiry.id,
      title: enquiry.type === "dealer_interest" ? "New dealer interest" : "New customer enquiry",
      detail: "Customer response received",
      createdAt: enquiry.created_at,
      icon: "message" as IconName,
      href: "/dealer/enquiries",
    })),
    ...drives.slice(0, 6).map((drive) => ({
      id: drive.id,
      title: "New test drive request",
      detail: `Request ${drive.status}`,
      createdAt: drive.created_at,
      icon: "calendar" as IconName,
      href: "/dealer/enquiries",
    })),
    ...offers.slice(0, 6).map((offer) => ({
      id: offer.id,
      title: "Offer sent to customer",
      detail: `Offer ${offer.status}`,
      createdAt: offer.created_at,
      icon: "offer" as IconName,
      href: "/dealer/offers",
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  const quickActions = [
    { href: "/dealer/cars/new", title: "Add a car", description: "List a new vehicle", icon: "plus" as IconName, accent: "bg-brand/10 text-brand-dark" },
    { href: "/dealer/cars", title: "My cars", description: `${formatNumber(total)} in inventory`, icon: "list" as IconName, accent: "bg-sky-100 text-sky-700" },
    { href: "/dealer/enquiries", title: "Customer enquiries", description: "Respond to leads", icon: "message" as IconName, accent: "bg-violet-100 text-violet-700" },
    { href: "/dealer/sell-requests", title: "Customer sell requests", description: "Find fresh demand", icon: "inbox" as IconName, accent: "bg-amber-100 text-amber-700" },
    { href: "/dealer/offers", title: "My offers", description: "Track sent offers", icon: "offer" as IconName, accent: "bg-emerald-100 text-emerald-700" },
    { href: "/dealer/demand", title: "Customer demand", description: "Explore market signals", icon: "demand" as IconName, accent: "bg-rose-100 text-rose-700" },
    { href: "/dealer/profile", title: "My profile", description: "Keep details current", icon: "profile" as IconName, accent: "bg-stone-100 text-stone-700" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-stone-900 p-5 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-sm font-medium text-stone-300">Dealer workspace</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Welcome back, {dealer.owner_name || "dealer"}</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-stone-300">Aapki live inventory, customer leads aur recent activity ek hi jagah dekhein.</p>
        </div>
        <ButtonLink href="/dealer/cars/new" className="w-fit shrink-0">
          <Icon name="plus" className="mr-2 size-4" />
          Add a car
        </ButtonLink>
      </div>

      {hasQueryError && (
        <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Some dashboard data could not be loaded. Refresh to try again.
        </Card>
      )}

      <section>
        <SectionTitle title="At a glance" description="Only activity connected to your dealership" />
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <MetricCard label="Active listings" value={active} detail="Live in marketplace" icon="car" tone="green" />
          <MetricCard label="Sold cars" value={sold} detail="Completed sales" icon="tag" tone="stone" />
          <MetricCard label="Enquiries" value={enquiriesResult.count ?? 0} detail="Customer messages" icon="message" tone="blue" />
          <MetricCard label="Test drives" value={drivesResult.count ?? 0} detail="Requests received" icon="calendar" tone="amber" />
          <MetricCard label="Offers sent" value={offersResult.count ?? 0} detail="On customer cars" icon="offer" tone="brand" />
        </div>
      </section>

      <section>
        <SectionTitle title="Quick actions" description="Jump to the workflows you use most" />
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {quickActions.map((action) => (
            <QuickAction key={action.href} {...action} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <SectionTitle title="Inventory status" description={`${formatNumber(total)} vehicles in your dealership`} />
            <span className="rounded-lg bg-brand/10 p-2 text-brand-dark"><Icon name="chart" className="size-4" /></span>
          </div>
          <div className="mt-6">
            <StatusChart active={active} sold={sold} other={other} />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <SectionTitle title="Leads this week" description="Enquiries and test-drive requests" />
            <span className="rounded-lg bg-violet-100 p-2 text-violet-700"><Icon name="activity" className="size-4" /></span>
          </div>
          <div className="mt-3">
            <TrendChart data={trend} />
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <SectionTitle title="Recent activity" description="Latest updates from your dealership" />
            <ButtonLink href="/dealer/cars" variant="ghost" size="sm">View cars</ButtonLink>
          </div>
          <div className="mt-5">
            <ActivityList items={activities} />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <SectionTitle title="Inventory by fuel" description="What customers are searching for" />
            <span className="rounded-lg bg-orange-100 p-2 text-orange-700"><Icon name="fuel" className="size-4" /></span>
          </div>
          <div className="mt-6">
            <FuelChart counts={fuelCounts} />
          </div>
        </Card>
      </section>
    </div>
  );
}
