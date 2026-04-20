import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartData = [
  { day: "Monday", call_duration: 80 },
  { day: "Tuesday", call_duration: 200 },
  { day: "Wednesday", call_duration: 120 },
  { day: "Thursday", call_duration: 190 },
  { day: "Friday", call_duration: 130 },
  { day: "Saturday", call_duration: 140 },
];

const chartConfig = {
  call_duration: {
    label: "Call Duration",
    color: "#ffffff",
  },
};

export function BarComp() {
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <BarChart accessibilityLayer data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="day"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="call_duration" fill="var(--color-desktop)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
